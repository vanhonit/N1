/* eslint react/sort-comp: 0 */
import _ from 'underscore';
import React from 'react';
import {remote} from 'electron';

import {
  Message,
  Actions,
  DraftStore,
  ComponentRegistry,
  WorkspaceStore,
} from 'nylas-exports';
import ComposeButton from './compose-button';
import ComposerView from './composer-view';

import InflatesDraftClientId from './decorators/inflates-draft-client-id';
const ComposerViewForDraftClientId = InflatesDraftClientId(ComposerView);

class ComposerWithWindowProps extends React.Component {
  static displayName = 'ComposerWithWindowProps';
  static containerRequired = false;

  constructor(props) {
    super(props);

    // We'll now always have windowProps by the time we construct this.
    const windowProps = NylasEnv.getWindowProps();
    const {draftJSON, draftClientId} = windowProps;
    if (!draftJSON) {
      throw new Error("Initialize popout composer windows with valid draftJSON")
    }
    const draft = new Message().fromJSON(draftJSON);
    DraftStore._createSession(draftClientId, draft);
    this.state = windowProps
  }

  componentWillUnmount() {
    if (this._usub) { this._usub() }
  }

  componentDidUpdate() {
    this.refs.composer.focus()
  }

  _onDraftReady = () => {
    this.refs.composer.focus().then(() => {
      const totalTime = NylasEnv.perf.stop("Popout Draft");
      if (!NylasEnv.inDevMode() && !NylasEnv.inSpecMode()) {
        Actions.recordUserEvent("Popout Composer Time", {totalTime})
      }
      NylasEnv.displayWindow();

      if (this.state.errorMessage) {
        this._showInitialErrorDialog(this.state.errorMessage);
      }

      // This will start loading the rest of the composer's plugins. This
      // may take a while (hundreds of ms) depending on how many plugins
      // you have installed. For some reason it takes two frames to
      // reliably get the basic composer (Send button, etc) painted
      // properly.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          NylasEnv.getCurrentWindow().updateLoadSettings({
            windowType: "composer",
          })
        })
      })
    });
  }

  render() {
    return (
      <ComposerViewForDraftClientId
        ref="composer"
        onDraftReady={this._onDraftReady}
        draftClientId={this.state.draftClientId}
        className="composer-full-window"
      />
    );
  }

  _showInitialErrorDialog(msg) {
    const dialog = remote.dialog;
    // We delay so the view has time to update the restored draft. If we
    // don't delay the modal may come up in a state where the draft looks
    // like it hasn't been restored or has been lost.
    _.delay(() => {
      dialog.showMessageBox(remote.getCurrentWindow(), {
        type: 'warning',
        buttons: ['Okay'],
        message: "Error",
        detail: msg,
      });
    }, 100);
  }
}

export function activate() {
  if (NylasEnv.isMainWindow()) {
    ComponentRegistry.register(ComposerViewForDraftClientId, {
      role: 'Composer',
    });
    ComponentRegistry.register(ComposeButton, {
      location: WorkspaceStore.Location.RootSidebar.Toolbar,
    });
  } else {
    NylasEnv.getCurrentWindow().setMinimumSize(480, 250);
    ComponentRegistry.register(ComposerWithWindowProps, {
      location: WorkspaceStore.Location.Center,
    });
  }
}

export function deactivate() {
  if (NylasEnv.isMainWindow()) {
    ComponentRegistry.unregister(ComposerViewForDraftClientId);
    ComponentRegistry.unregister(ComposeButton);
  } else {
    ComponentRegistry.unregister(ComposerWithWindowProps);
  }
}

export function serialize() {
  return this.state;
}
