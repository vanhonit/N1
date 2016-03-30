import React from 'react'
import ScheduleActions from './schedule-actions'
import {CALENDAR_ID} from './scheduler-constants'

/**
 * Gets rendered in a CalendarEvent
 */
export default class ProposedTimeEvent extends React.Component {
  static displayName = "ProposedTimeEvent";

  static propTypes = {
    event: React.PropTypes.object,
  }

  _onMouseDown(event) {
    event.stopPropagation();
    ScheduleActions.removeProposedTime(event.target.dataset)
  }

  render() {
    if (this.props.event.calendarId === CALENDAR_ID) {
      return (
        <div className="rm-time"
          data-end={event.end}
          data-start={event.start}
          onMouseDown={this._onMouseDown}
        >&times;</div>
      )
    }
    return false
  }
}
