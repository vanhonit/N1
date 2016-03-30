import {
  Actions,
  TaskQueueStatusStore,
  RegisterDraftForPluginTask} from 'nylas-exports';
import {PLUGIN_ID, PLUGIN_URL} from './open-tracking-constants'

export default class OpenTrackingAfterSend {
  static afterDraftSend({message, draftClientId}) {
    if (!NylasEnv.isMainWindow()) return;
    if (message.metadataForPluginId(PLUGIN_ID)) {
      const task = new RegisterDraftForPluginTask({
        messageId: message.id,
        draftClientId,
        pluginServerUrl: `${PLUGIN_URL}/plugins/register-message`,
      });
      TaskQueueStatusStore.waitForPerformRemote(task).catch((error) => {
        const msg = `There was a problem saving your read receipt \
settings. You will not get a read receipt for this message. \
${error.message || ""}`
        NylasEnv.showErrorDialog(msg)
      })
      Actions.queueTask(task);
    }
  }
}
