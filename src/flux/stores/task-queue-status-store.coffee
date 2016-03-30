_ = require 'underscore'
Rx = require 'rx-lite'
Actions = require '../actions'
NylasStore = require 'nylas-store'
DatabaseStore = require './database-store'
AccountStore = require './account-store'
TaskQueue = require './task-queue'

# Public: The TaskQueueStatusStore allows you to inspect the task queue from
# any window, even though the queue itself only runs in the work window.
#
class TaskQueueStatusStore extends NylasStore

  constructor: ->
    @listenTo Actions.taskLocalSuccess, (task) =>
      @_waitingLocals[task.id]?.resolve(task)
    @listenTo Actions.taskLocalFailed, ([task, error]) =>
      @_waitingLocals[task.id]?.reject(error)
    @listenTo Actions.taskRemoteSuccess, (task) =>
      @_waitingRemotes[task.id]?.resolve(task)
    @listenTo Actions.taskRemoteFailed, ([task, error]) =>
      @_waitingRemotes[task.id]?.reject(error)

    @_queue = []
    @_waitingLocals = {}
    @_waitingRemotes = {}

    query = DatabaseStore.findJSONBlob(TaskQueue.JSONBlobStorageKey)
    Rx.Observable.fromQuery(query).subscribe (json) =>
      @_queue = json || []
      @trigger()

  queue: ->
    @_queue

  waitForPerformLocal: (task) =>
    new Promise (resolve, reject) =>
      @_waitingLocals[task.id] = {
        taskId: task.id,
        resolve: resolve,
        reject: reject,
      }

  waitForPerformRemote: (task) =>
    new Promise (resolve, reject) =>
      @_waitingRemotes[task.id] = {
        taskId: task.id,
        resolve: resolve,
        reject: reject,
      }

  tasksMatching: (type, matching = {}) ->
    type = type.name unless _.isString(type)
    @_queue.filter (task) -> task.constructor.name is type and _.isMatch(task, matching)

module.exports = new TaskQueueStatusStore()
