import { api } from '@/shared/apiService';
import {
  BotState,
  BlacklistPayload,
  ForcebuyPayload,
  Logs,
  DailyPayload,
  Trade,
  PairHistoryPayload,
  PlotConfig,
  EMPTY_PLOTCONFIG,
} from '@/types';

import { saveCustomPlotConfig } from '@/shared/storage';
import { showAlert } from './alerts';

export enum BotStoreGetters {
  openTrades = 'openTrades',
  tradeDetail = 'tradeDetail',
  closedTrades = 'closedTrades',
}

export default {
  namespaced: true,
  state: {
    version: '',
    lastLogs: '',
    trades: [],
    openTrades: [],
    tradeCount: 0,
    performanceStats: [],
    whitelist: [],
    blacklist: [],
    profit: {},
    botState: {},
    balance: {},
    dailyStats: [],
    pairlistMethods: [],
    detailTradeId: null,
    history: {},
    plotConfig: {},
    customPlotConfig: { ...EMPTY_PLOTCONFIG },
  },
  getters: {
    [BotStoreGetters.openTrades](state) {
      return state.openTrades;
    },
    [BotStoreGetters.tradeDetail](state) {
      let dTrade = state.openTrades.find((item) => item.trade_id === state.detailTradeId);
      if (!dTrade) {
        dTrade = state.trades.find((item) => item.trade_id === state.detailTradeId);
      }
      return dTrade;
    },
    [BotStoreGetters.closedTrades](state) {
      return state.trades.filter((item) => !item.is_open);
    },
  },
  mutations: {
    updateTrades(state, trades) {
      state.trades = trades.trades;
      state.tradeCount = trades.trades_count;
    },
    updateOpenTrades(state, trades) {
      state.openTrades = trades;
    },
    updatePerformance(state, performance) {
      state.performanceStats = performance;
    },
    updateWhitelist(state, whitelist) {
      state.whitelist = whitelist.whitelist;
      state.pairlistMethods = whitelist.method;
    },
    updateBlacklist(state, blacklist) {
      state.blacklist = blacklist.blacklist;
    },
    updateProfit(state, profit) {
      state.profit = profit;
    },
    updateDaily(state, daily) {
      state.dailyStats = daily;
    },
    updateBalance(state, balance) {
      state.balance = balance;
    },
    updateState(state, botState: BotState) {
      state.botState = botState;
    },
    updateVersion(state, version) {
      state.version = version.version;
    },
    updateLogs(state, logs: Logs) {
      state.lastLogs = logs.logs;
    },
    setDetailTrade(state, trade: Trade) {
      state.detailTradeId = trade ? trade.trade_id : null;
    },
    updatePairHistory(state, { pair, timeframe, data }) {
      state.history = { ...state.history, [`${pair}__${timeframe}`]: data };
    },
    updatePlotConfig(state, plotConfig: PlotConfig) {
      state.plotConfig = plotConfig;
    },
    saveCustomPlotConfig(state, plotConfig: PlotConfig) {
      state.customPlotConfig = plotConfig;
      saveCustomPlotConfig(plotConfig);
    },
  },
  actions: {
    ping({ commit, rootState }) {
      if (rootState.loggedIn) {
        api
          .get('/ping')
          .then((result) => {
            commit('setPing', result.data, { root: true });
            commit('setIsBotOnline', result.data, { root: true });
          })
          .catch(console.error);
      }
    },
    setDetailTrade({ commit }, trade: Trade) {
      commit('setDetailTrade', trade);
    },
    getTrades({ commit }) {
      return api
        .get('/trades')
        .then((result) => commit('updateTrades', result.data))
        .catch(console.error);
    },
    getOpenTrades({ commit }) {
      return api
        .get('/status')
        .then((result) => commit('updateOpenTrades', result.data))
        .catch(console.error);
    },
    getPairHistory({ commit }, payload: PairHistoryPayload) {
      if (payload.pair && payload.timeframe && payload.limit) {
        return api
          .get('/pair_history', {
            params: { pair: payload.pair, timeframe: payload.timeframe, limit: payload.limit },
          })
          .then((result) => {
            commit('updatePairHistory', {
              pair: payload.pair,
              timeframe: payload.timeframe,
              data: result.data,
            });
          })
          .catch(console.error);
      }
      // Error branchs
      const error = 'pair or timeframe not specified';
      console.error(error);
      return new Promise((resolve, reject) => {
        reject(error);
      });
    },
    getPlotConfig({ commit }) {
      return api
        .get('/plot_config')
        .then((result) => commit('updatePlotConfig', result.data))
        .catch(console.error);
    },
    getPerformance({ commit }) {
      return api
        .get('/performance')
        .then((result) => commit('updatePerformance', result.data))
        .catch(console.error);
    },
    getWhitelist({ commit }) {
      return api
        .get('/whitelist')
        .then((result) => commit('updateWhitelist', result.data))
        .catch(console.error);
    },
    getBlacklist({ commit }) {
      return api
        .get('/blacklist')
        .then((result) => commit('updateBlacklist', result.data))
        .catch(console.error);
    },
    getProfit({ commit }) {
      return api
        .get('/profit')
        .then((result) => commit('updateProfit', result.data))
        .catch(console.error);
    },
    getBalance({ commit }) {
      return api
        .get('/balance')
        .then((result) => commit('updateBalance', result.data))
        .catch(console.error);
    },
    getDaily({ commit }, payload: DailyPayload = {}) {
      const { timescale = 20 } = payload;
      return api
        .get('/daily', { params: { timescale } })
        .then((result) => commit('updateDaily', result.data))
        .catch(console.error);
    },
    getState({ commit }) {
      return api
        .get('/show_config')
        .then((result) => commit('updateState', result.data))
        .catch(console.error);
    },
    getVersion({ commit }) {
      return api
        .get('/version')
        .then((result) => commit('updateVersion', result.data))
        .catch(console.error);
    },
    getLogs({ commit }) {
      return api
        .get('/logs')
        .then((result) => commit('updateLogs', result.data))
        .catch(console.error);
    },
    // Post methods
    // TODO: Migrate calls to API to a seperate module unrelated to vuex?
    async startBot({ dispatch }) {
      try {
        const res = await api.post('/start', {});
        console.log(res.data);
        showAlert(dispatch, res.data.status);
        return Promise.resolve(res);
      } catch (error) {
        console.error(error.resposne);
        showAlert(dispatch, 'Error starting bot.');
        return Promise.reject(error);
      }
    },
    async stopBot({ dispatch }) {
      try {
        const res = await api.post('/stop', {});
        showAlert(dispatch, res.data.status);
        return Promise.resolve(res);
      } catch (error) {
        console.error(error.resposne);
        showAlert(dispatch, 'Error stopping bot.');
        return Promise.reject(error);
      }
    },
    async stopBuy({ dispatch }) {
      try {
        const res = await api.post('/stopbuy', {});
        showAlert(dispatch, res.data.status);
        return Promise.resolve(res);
      } catch (error) {
        console.error(error.resposne);
        showAlert(dispatch, 'Error calling stopbuy.');
        return Promise.reject(error);
      }
    },
    async reloadConfig({ dispatch }) {
      try {
        const res = await api.post('/reload_config', {});
        console.log(res.data);
        showAlert(dispatch, res.data.status);
        return Promise.resolve(res);
      } catch (error) {
        console.error(error.resposne);
        showAlert(dispatch, 'Error reloading.');
        return Promise.reject(error);
      }
    },
    async deleteTrade({ dispatch }, tradeid: string) {
      try {
        const res = await api.delete(`/trades/${tradeid}`);
        showAlert(dispatch, res.data.result_msg ? res.data.result_msg : `Deleted Trade ${tradeid}`);
        return Promise.resolve(res);
      } catch (error) {
        console.error(error.response);
        showAlert(dispatch, `Failed to delete trade ${tradeid}`, 'danger');
        return Promise.reject(error);
      }
    },
    async forcesell({ dispatch }, tradeid: string) {
      if (tradeid) {
        const payload = { tradeid };
        try {
          const res = await api.post('/forcesell', payload);
          showAlert(dispatch, `Sell order for ${tradeid} created`);
          return Promise.resolve(res);
        } catch (error) {
          console.error(error.response);
          showAlert(dispatch, `Failed to create sell order for ${tradeid}`, 'danger');
          return Promise.reject(error);
        }
      }
      // Error branchs
      const error = 'Tradeid is empty';
      console.error(error);
      return Promise.reject(error);
    },
    async forcebuy({ dispatch }, payload: ForcebuyPayload) {
      if (payload && payload.pair) {
        try {
          const res = await api.post('/forcebuy', payload);
          showAlert(dispatch, `Buy order for ${payload.pair} created.`);

          return Promise.resolve(res);
        } catch (error) {
          console.error(error.response);
          showAlert(dispatch, `Error occured buying: '${error.response.data.error}'`, 'danger');
          return Promise.reject(error);
        }
      }
      // Error branchs
      const error = 'Pair is empty';
      console.error(error);
      return Promise.reject(error);
    },
    async addBlacklist({ commit, dispatch }, payload: BlacklistPayload) {
      console.log(`Adding ${payload} to blacklist`);
      if (payload && payload.blacklist) {
        try {
          const result = await api.post('/blacklist', payload);
          commit('updateBlacklist', result.data);
          if (result.data.errors && Object.keys(result.data.errors).length !== 0) {
            const { errors } = result.data;
            Object.keys(errors).forEach((pair) => {
              showAlert(
                dispatch,
                `Error while adding pair ${pair} to Blacklist: ${errors[pair].error_msg}`,
              );
            });
          } else {
            showAlert(dispatch, `Pair ${payload.blacklist} added.`);
          }
          return Promise.resolve(result.data);
        } catch (error) {
          console.error(error.response);
          showAlert(
            dispatch,
            `Error occured while adding pairs to Blacklist: '${error.response.data.error}'`,
            'danger',
          );

          return Promise.reject(error);
        }
      }
      // Error branchs
      const error = 'Pair is empty';
      console.error(error);
      return Promise.reject(error);
    },
  },
};
