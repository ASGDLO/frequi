import { defineStore } from 'pinia';
import { useBotStore } from './ftbotwrapper';

import {
  Pairlist,
  PairlistConfig,
  PairlistParamType,
  PairlistPayloadItem,
  PairlistsPayload,
} from '@/types';
import { computed, ref, toRaw } from 'vue';
import { showAlert } from './alerts';

export const usePairlistConfigStore = defineStore(
  'pairlistConfig',
  () => {
    const botStore = useBotStore();

    const evaluating = ref<boolean>(false);
    const intervalId = ref<number>();
    const stakeCurrency = ref<string>(botStore.activeBot?.stakeCurrency ?? 'USDT');
    const whitelist = ref<string[]>([]);
    const blacklist = ref<string[]>([]);
    const config = ref<PairlistConfig>({ name: '', pairlists: [] });
    const savedConfigs = ref<PairlistConfig[]>([]);

    const firstPairlistIsGenerator = computed<boolean>(() => {
      // First pairlist must be a generator
      if (config.value.pairlists[0]?.is_pairlist_generator) {
        return true;
      }
      return false;
    });

    const pairlistValid = computed<boolean>(() => {
      return firstPairlistIsGenerator.value && config.value.pairlists.length > 0;
    });

    const configJSON = computed(() => {
      return JSON.stringify(configToPayloadItems(), null, 2);
    });

    const isSavedConfig = computed(
      () => savedConfigs.value.findIndex((c) => c.name === config.value.name) > -1,
    );

    function addToConfig(pairlist: Pairlist, index: number) {
      pairlist = structuredClone(toRaw(pairlist));
      for (const param in pairlist.params) {
        pairlist.params[param].value = pairlist.params[param].default
          ? pairlist.params[param].default.toString()
          : '';
      }
      config.value.pairlists.splice(index, 0, pairlist);
    }

    function removeFromConfig(index: number) {
      config.value.pairlists.splice(index, 1);
    }

    function saveConfig(name: string) {
      const i = savedConfigs.value.findIndex((c) => c.name === config.value.name);
      config.value.name = name;

      if (i > -1) {
        savedConfigs.value[i] = config.value;
      } else {
        savedConfigs.value.push(config.value);
      }
    }

    function cloneConfig() {
      config.value = {
        name: '',
        pairlists: structuredClone(toRaw(config.value.pairlists)),
      };
    }

    function deleteConfig() {
      const i = savedConfigs.value.findIndex((c) => c.name === config.value.name);
      if (i > -1) {
        savedConfigs.value.splice(i, 1);
        config.value = { name: '', pairlists: [] };
      }
    }

    function newConfig() {
      config.value = { name: '', pairlists: [] };
    }

    function selectConfig(selected: PairlistConfig) {
      config.value = structuredClone(toRaw(selected));
    }

    function addToBlacklist() {
      blacklist.value.push('');
    }

    function removeFromBlacklist(index: number) {
      blacklist.value.splice(index, 1);
    }

    async function startPairlistEvaluation() {
      const payload: PairlistsPayload = configToPayload();

      evaluating.value = true;
      const { job_id: jobId } = await botStore.activeBot.evaluatePairlist(payload);
      console.log('jobId', jobId);

      intervalId.value = setInterval(async () => {
        const res = await botStore.activeBot.getBackgroundJobStatus(jobId);
        if (!res.running) {
          clearInterval(intervalId.value);
          const wl = await botStore.activeBot.getPairlistEvalResult(jobId);
          evaluating.value = false;
          if (wl.status === 'success') {
            whitelist.value = wl.result.whitelist;
          } else if (wl.error) {
            showAlert(wl.error, 'danger');
            evaluating.value = false;
          }
        }
      }, 1000);
    }

    function convertToParamType(type: PairlistParamType, value: string) {
      if (type === PairlistParamType.number) {
        return Number(value);
      } else if (type === PairlistParamType.boolean) {
        return Boolean(value);
      } else {
        return String(value);
      }
    }

    function configToPayload(): PairlistsPayload {
      const pairlists: PairlistPayloadItem[] = configToPayloadItems();
      return {
        pairlists: pairlists,
        stake_currency: stakeCurrency.value,
        blacklist: blacklist.value,
      };
    }

    function configToPayloadItems() {
      const pairlists: PairlistPayloadItem[] = [];
      config.value.pairlists.forEach((config) => {
        const pairlist = {
          method: config.name,
        };
        for (const key in config.params) {
          const param = config.params[key];
          if (param.value) {
            pairlist[key] = convertToParamType(param.type, param.value);
          }
        }
        pairlists.push(pairlist);
      });

      return pairlists;
    }

    return {
      evaluating,
      whitelist,
      config,
      configJSON,
      savedConfigs,
      blacklist,
      startPairlistEvaluation,
      addToConfig,
      removeFromConfig,
      saveConfig,
      cloneConfig,
      deleteConfig,
      selectConfig,
      newConfig,
      addToBlacklist,
      removeFromBlacklist,
      isSavedConfig,
      firstPairlistIsGenerator,
      pairlistValid,
      stakeCurrency,
    };
  },
  {
    persist: {
      key: 'pairlist-configs',
      paths: ['savedConfigs', 'blacklist'],
    },
  },
);
