import { defineStore } from 'pinia';
import { AlertType } from '@/types/alertTypes';

export const useAlertsStore = defineStore('alerts', {
  state: () => {
    return { activeMessages: [] as AlertType[] };
  },
  actions: {
    addAlert(message: AlertType) {
      this.activeMessages.push(message);
    },
    removeAlert(alert: AlertType) {
      console.log('dismissed', alert);
      this.activeMessages = this.activeMessages.filter((v) => v !== alert);
    },
  },
});
