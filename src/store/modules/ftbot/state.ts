import { getPlotConfigName, getAllPlotConfigNames } from '@/shared/storage';

import {
  BotState,
  Trade,
  PlotConfig,
  EMPTY_PLOTCONFIG,
  StrategyResult,
  BalanceInterface,
  DailyReturnValue,
  LockResponse,
  PlotConfigStorage,
} from '@/types';

export interface FtbotStateType {
  version: string;
  lastLogs: Array<[string, number, string, string, string]>;
  refreshRequired: boolean;
  trades: Trade[];
  openTrades: Trade[];
  tradeCount: number;
  performanceStats: Performance[];
  whitelist: string[];
  blacklist: string[];
  // TODO: type me
  profit: {};
  botState: BotState | undefined;
  balance: BalanceInterface | {};
  dailyStats: DailyReturnValue | {};
  pairlistMethods: string[];
  detailTradeId: number | undefined;
  selectedPair: string;
  // TODO: type me
  candleData: {};
  // TODO: type me
  history: {};
  strategyPlotConfig: PlotConfig | {};
  customPlotConfig: PlotConfigStorage;
  plotConfigName: string;
  availablePlotConfigNames: string[];
  strategyList: string[];
  strategy: StrategyResult | {};
  pairlist: string[];
  currentLocks: LockResponse | undefined;
}
const state: FtbotStateType = {
  version: '',
  lastLogs: [],
  refreshRequired: true,
  trades: [],
  openTrades: [],
  tradeCount: 0,
  performanceStats: [],
  whitelist: [],
  blacklist: [],
  profit: {},
  botState: undefined,
  balance: {},
  dailyStats: {},
  pairlistMethods: [],
  detailTradeId: undefined,
  selectedPair: '',
  candleData: {},
  history: {},
  strategyPlotConfig: {},
  customPlotConfig: {},
  plotConfigName: getPlotConfigName(),
  availablePlotConfigNames: getAllPlotConfigNames(),
  strategyList: [],
  strategy: {},
  pairlist: [],
  currentLocks: undefined,
};

export default state;
