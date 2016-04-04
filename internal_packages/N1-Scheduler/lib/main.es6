import ProposedTimeEvent from './calendar/proposed-time-event'
import ProposedTimeStore from './proposed-time-store'
import ProposedTimePicker from './calendar/proposed-time-picker'
import NewEventCardContainer from './composer/new-event-card-container'
import SchedulerComposerButton from './composer/scheduler-composer-button';
import SchedulerComposerExtension from './composer/scheduler-composer-extension';

import {PLUGIN_ID, PLUGIN_URL} from './scheduler-constants'

import {
  Actions,
  WorkspaceStore,
  ComponentRegistry,
  ExtensionRegistry,
  RegisterDraftForPluginTask,
} from 'nylas-exports'

export function activate() {
  if (NylasEnv.getWindowType() === 'calendar') {
    ProposedTimeStore.activate()

    NylasEnv.getCurrentWindow().setMinimumSize(480, 250)
    WorkspaceStore.defineSheet('Main', {root: true},
      {popout: ['Center']})

    ComponentRegistry.register(ProposedTimeEvent,
      {role: 'Calendar:Event'});

    ComponentRegistry.register(ProposedTimePicker,
      {location: WorkspaceStore.Location.Center})
  } else {
    ComponentRegistry.register(NewEventCardContainer,
      {role: 'Composer:Footer'});

    ComponentRegistry.register(SchedulerComposerButton,
      {role: 'Composer:ActionButton'});

    ExtensionRegistry.Composer.register(SchedulerComposerExtension)

    const errorMessage = `There was a temporary problem setting up \
these proposed times. Please manually follow up to schedule your event.`

    this._usub = Actions.sendDraftSuccess.listen(({message, draftClientId}) => {
      if (!NylasEnv.isMainWindow()) return;
      if (message.metadataForPluginId(PLUGIN_ID)) {
        const task = new RegisterDraftForPluginTask({
          errorMessage,
          draftClientId,
          messageId: message.id,
          pluginServerUrl: `${PLUGIN_URL}/plugins/register-message`,
        });
        Actions.queueTask(task);
      }
    })
  }
}

export function serialize() {
}

export function deactivate() {
  if (NylasEnv.getWindowType() === 'calendar') {
    ProposedTimeStore.deactivate()
    ComponentRegistry.unregister(ProposedTimeEvent);
    ComponentRegistry.unregister(ProposedTimePicker);
  } else {
    ComponentRegistry.unregister(NewEventCardContainer);
    ComponentRegistry.unregister(SchedulerComposerButton);
    ExtensionRegistry.Composer.unregister(SchedulerComposerExtension);
    this._usub()
  }
}
