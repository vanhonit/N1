import React from 'react'
import {PLUGIN_ID} from './scheduler-constants'
import ProposedTimeList from './proposed-time-list'
import {RegExpUtils, ComposerExtension} from 'nylas-exports'

/**
 * Inserts the set of Proposed Times into the body of the HTML email.
 *
 */
export default class SchedulerComposerExtension extends ComposerExtension {

  static listRegex() {
    return new RegExp(/<proposed-time-list>.*<\/proposed-time-list>/)
  }

  static _findInsertionPoint(body) {
    const checks = [
      /<!-- <signature> -->/,
      RegExpUtils.signatureRegex(),
      RegExpUtils.n1QuoteStartRegex(),
    ]

    let insertionPoint = -1
    for (const check of checks) {
      insertionPoint = body.search(check);
      if (insertionPoint >= 0) { break; }
    }
    if (insertionPoint === -1) { insertionPoint = body.length }
    return insertionPoint
  }

  static _insertInBody(body, markup) {
    // Remove any existing signature in the body
    const re = SchedulerComposerExtension.listRegex()
    const cleanBody = body.replace(re, "");

    const insertionPoint = SchedulerComposerExtension._findInsertionPoint(cleanBody)

    const contentBefore = cleanBody.slice(0, insertionPoint);
    const contentAfter = cleanBody.slice(insertionPoint);
    const wrapS = "<proposed-time-list>"
    const wrapE = "</proposed-time-list>"

    return contentBefore + wrapS + markup + wrapE + contentAfter
  }

  static applyTransformsToDraft({draft}) {
    const nextDraft = draft.clone();
    const metadata = draft.metadataForPluginId(PLUGIN_ID)
    if (metadata && metadata.proposals) {
      const el = React.createElement(ProposedTimeList,
        {
          draft,
          inEmail: true,
          proposals: metadata.proposals,
        });
      const markup = React.renderToStaticMarkup(el);
      const nextBody = SchedulerComposerExtension._insertInBody(nextDraft.body, markup)
      nextDraft.body = nextBody;
    }
    return nextDraft;
  }

  static unapplyTransformsToDraft({draft}) {
    const nextDraft = draft.clone();
    const re = SchedulerComposerExtension.listRegex()
    const body = nextDraft.body.replace(re, "");
    nextDraft.body = body;
    return nextDraft
  }
}
