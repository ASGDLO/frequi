import { BotDescriptor, BotDescriptors } from '@/types';
import { AxiosInstance } from 'axios';
import { BotStoreActions, BotStoreGetters, createBotSubStore } from './ftbot';

const AUTO_REFRESH = 'ft_auto_refresh';

interface FTMultiBotState {
  selectedBot: string;
  availableBots: BotDescriptors;
  autoRefresh: boolean;
  refreshing: boolean;
  refreshInterval: number | null;
  refreshIntervalSlow: number | null;
}

export enum MultiBotStoreGetters {
  hasBots = 'hasBots',
  botCount = 'botCount',
  selectedBot = 'selectedBot',
  selectedBotObj = 'selectedBotObj',
  allAvailableBots = 'allAvailableBots',
  allAvailableBotsList = 'allAvailableBotsList',
  allIsBotOnline = 'allIsBotOnline',
  nextBotId = 'nextBotId',
  autoRefresh = 'autoRefresh',
}

export default function createBotStore(store) {
  const state: FTMultiBotState = {
    selectedBot: '',
    availableBots: {},
    autoRefresh: JSON.parse(localStorage.getItem(AUTO_REFRESH) || '{}'),
    refreshing: false,
    refreshInterval: null,
    refreshIntervalSlow: null,
  };

  // All getters working on all bots should be prefixed with all.
  const getters = {
    [MultiBotStoreGetters.hasBots](state: FTMultiBotState): boolean {
      return Object.keys(state.availableBots).length > 0;
    },
    [MultiBotStoreGetters.botCount](state: FTMultiBotState): number {
      return Object.keys(state.availableBots).length;
    },
    [MultiBotStoreGetters.selectedBot](state: FTMultiBotState): string {
      return state.selectedBot;
    },
    [MultiBotStoreGetters.selectedBotObj](state: FTMultiBotState): BotDescriptor {
      return state.availableBots[state.selectedBot];
    },
    [MultiBotStoreGetters.allAvailableBots](state: FTMultiBotState): BotDescriptors {
      return state.availableBots;
    },
    [MultiBotStoreGetters.allAvailableBotsList](state: FTMultiBotState): string[] {
      return Object.keys(state.availableBots);
    },
    [MultiBotStoreGetters.allIsBotOnline](state: FTMultiBotState, getters): {} {
      const result = {};
      getters.allAvailableBotsList.forEach((e) => {
        result[e] = getters[`${e}/isBotOnline`];
      });
      return result;
    },
    [MultiBotStoreGetters.nextBotId](state: FTMultiBotState): string {
      let botCount = Object.keys(state.availableBots).length;

      while (`ftbot.${botCount}` in state.availableBots) {
        botCount += 1;
      }
      return `ftbot.${botCount}`;
    },
    [MultiBotStoreGetters.autoRefresh](state: FTMultiBotState): boolean {
      return state.autoRefresh;
    },
  };
  // Autocreate getters from botStores
  Object.keys(BotStoreGetters).forEach((e) => {
    getters[e] = (state, getters) => {
      return getters[`${state.selectedBot}/${e}`];
    };
  });

  const mutations = {
    selectBot(state: FTMultiBotState, botId: string) {
      if (botId in state.availableBots) {
        state.selectedBot = botId;
      } else {
        console.warn(`Botid ${botId} not available, but selected.`);
      }
    },
    setAutoRefresh(state: FTMultiBotState, newRefreshValue: boolean) {
      state.autoRefresh = newRefreshValue;
    },
    setRefreshing(state, refreshing: boolean) {
      state.refreshing = refreshing;
    },
    addBot(state: FTMultiBotState, bot: BotDescriptor) {
      state.availableBots[bot.botId] = bot;
    },
    removeBot(state: FTMultiBotState, botId: string) {
      if (botId in state.availableBots) {
        delete state.availableBots[botId];
      }
    },
    setRefreshInterval(state: FTMultiBotState, interval: number | null) {
      state.refreshInterval = interval;
    },
    setRefreshIntervalSlow(state: FTMultiBotState, interval: number | null) {
      state.refreshIntervalSlow = interval;
    },
  };

  const actions = {
    // Actions automatically filled below
    addBot({ getters, commit }, bot: BotDescriptor) {
      if (Object.keys(getters.allAvailableBots).includes(bot.botId)) {
        // throw 'Bot already present';
        // TODO: handle error!
        console.log('Bot already present');
        return;
      }
      console.log('add bot', bot);
      store.registerModule(['ftbot', bot.botId], createBotSubStore(bot.botId));
      commit('addBot', bot);
    },
    removeBot({ commit, getters, dispatch }, botId: string) {
      if (Object.keys(getters.allAvailableBots).includes(botId)) {
        dispatch(`${botId}/logout`);
        store.unregisterModule([`ftbot`, botId]);
        commit('removeBot', botId);
      } else {
        console.warn(`bot ${botId} not found! could not remove`);
      }
    },
    selectFirstBot({ commit, getters }) {
      if (getters.hasBots) {
        const firstBot = Object.keys(getters.allAvailableBots)[0];
        console.log(firstBot);
        commit('selectBot', getters.allAvailableBots[firstBot].botId);
      }
    },
    selectBot({ commit }, botId: string) {
      commit('selectBot', botId);
    },
    setAutoRefresh({ dispatch, commit }, newRefreshValue) {
      // TODO: global autorefresh, or per subbot?
      console.log('setAutoRefresh', newRefreshValue);
      commit('setAutoRefresh', newRefreshValue);
      // TODO: Investigate this -
      // this ONLY works if ReloadControl is only visible once,otherwise it triggers twice
      if (newRefreshValue) {
        dispatch('startRefresh', true);
      } else {
        dispatch('stopRefresh');
      }
      localStorage.setItem(AUTO_REFRESH, JSON.stringify(newRefreshValue));
    },
    async refreshFull({ dispatch, state, commit }, forceUpdate = false) {
      if (state.refreshing) {
        return;
      }
      commit('setRefreshing', true);
      try {
        const updates: Promise<AxiosInstance>[] = [];
        updates.push(dispatch('refreshFrequent', false));
        updates.push(dispatch('refreshSlow', forceUpdate));
        updates.push(dispatch('getDaily'));
        updates.push(dispatch('getBalance'));

        await Promise.all(updates);
        console.log('refreshing_end');
      } finally {
        commit('setRefreshing', false);
      }
    },

    startRefresh({ getters, state, dispatch, commit }, runNow: boolean) {
      console.log('starting refresh');
      // Start refresh timer
      if (getters.hasBots !== true) {
        console.log('Not logged in.');
        return;
      }
      console.log('Starting automatic refresh.');
      if (runNow) {
        dispatch('refreshFrequent', false);
        dispatch('refreshSlow', true);
      }
      if (state.autoRefresh) {
        if (!state.refreshInterval) {
          // Set interval for refresh
          const refreshInterval = window.setInterval(() => {
            dispatch('refreshFrequent');
          }, 5000);
          commit('setRefreshInterval', refreshInterval);
        }
        if (!state.refreshIntervalSlow) {
          const refreshIntervalSlow = window.setInterval(() => {
            dispatch('refreshSlow', false);
          }, 60000);
          commit('setRefreshIntervalSlow', refreshIntervalSlow);
        }
      }
    },
    stopRefresh({ state, commit }: { state: FTMultiBotState; commit: any }) {
      console.log('Stopping automatic refresh.');
      if (state.refreshInterval) {
        window.clearInterval(state.refreshInterval);
        commit('setRefreshInterval', null);
      }
      if (state.refreshIntervalSlow) {
        window.clearInterval(state.refreshIntervalSlow);
        commit('setRefreshIntervalSlow', null);
      }
    },

    pingAll({ getters, dispatch }) {
      getters.allAvailableBotsList.forEach((e) => {
        dispatch(`${e}/ping`);
      });
    },
  };
  // Autocreate Actions from botstores
  Object.keys(BotStoreActions).forEach((e) => {
    actions[e] = ({ state, dispatch, getters }, ...args) => {
      if (getters.hasBots) {
        return dispatch(`${state.selectedBot}/${e}`, ...args);
      }
      console.warn(`bot ${state.selectedBot} is not registered.`);
      return {};
    };
  });

  return {
    namespaced: true,
    // modules: {
    //   'ftbot.0': createBotSubStore('ftbot.0'),
    // },
    state,
    mutations,

    getters,
    actions,
  };
}
