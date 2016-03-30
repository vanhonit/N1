import {
  ComponentRegistry,
  ExtensionRegistry,
  RegisterDraftForPluginTask,
} from 'nylas-exports';
import LinkTrackingButton from './link-tracking-button';
import LinkTrackingComposerExtension from './link-tracking-composer-extension';
import LinkTrackingMessageExtension from './link-tracking-message-extension';
import {PLUGIN_ID, PLUGIN_URL} from './link-tracking-constants'


export function activate() {
  ComponentRegistry.register(LinkTrackingButton,
    {role: 'Composer:ActionButton'});

  ExtensionRegistry.Composer.register(LinkTrackingComposerExtension);

  ExtensionRegistry.MessageView.register(LinkTrackingMessageExtension);

  const errorMessage = `There was a problem saving your link tracking \
settings. This message will not have link tracking.`

  this._usub = RegisterDraftForPluginTask.afterSendHelper({
    errorMessage,
    pluginId: PLUGIN_ID,
    pluginUrl: `${PLUGIN_URL}/plugins/register-message`,
  })
}

export function serialize() {}

export function deactivate() {
  ComponentRegistry.unregister(LinkTrackingButton);
  ExtensionRegistry.Composer.unregister(LinkTrackingComposerExtension);
  ExtensionRegistry.MessageView.unregister(LinkTrackingMessageExtension);
  this._usub()
}
