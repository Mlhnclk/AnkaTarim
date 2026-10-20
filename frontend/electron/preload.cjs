const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  printHtml: async (html) => {
    try {
      return await ipcRenderer.invoke('print-html', html);
    } catch (error) {
      console.error('Print bridge failed:', error);
      return false;
    }
  },
});
