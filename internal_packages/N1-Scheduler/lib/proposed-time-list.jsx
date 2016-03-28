import _ from 'underscore'
import moment from 'moment'
import React from 'react'
import {RetinaImg} from 'nylas-component-kit'
import {Event} from 'nylas-exports'

export default class ProposedTimeList extends React.Component {
  static displyName = "ProposedTimeList";

  static propTypes = {
    event: React.PropTypes.instanceOf(Event),
    inEmail: React.PropTypes.bool,
    proposals: React.PropTypes.array,
  }

  _renderProposalsForDay(proposalsForDay) {
    return proposalsForDay.map((p) => {
      return (
        <div className="proposal" key={p.start}>
          {moment.unix(p.start).format("LT")}
          &nbsp;&mdash;&nbsp;
          {moment.unix(p.end).add(1, 'second').format("LT")}
        </div>
      )
    })
  }

  _renderHeader() {
    if (false) {
      return (
        <div style={this._sProposalHeader()}>
          <h2 style={this._sProposalTitle()}>{this.props.event.title}</h2>
          <span>Select a time to schedule instantly:</span>
        </div>
      )
    }
    return (
      <span>
        <span className="field-icon">
          <RetinaImg name="ic-eventcard-time.png"
            mode={RetinaImg.Mode.ContentPreserve}
          />
        </span>
        <span>Proposed times:</span>
      </span>
    )
  }

  _sProposalTimeList() {
    if (this.props.inEmail) {
      return {
        borderRadius: "4px",
        border: "1px solid rgba(0,0,0,0.28)",
        padding: "15px",
        margin: "10px 0",
      }
    }
    return {
      display: "block",
    }
  }

  _sProposalHeader() {
    return {
    }
  }

  _sProposalTitle() {
    return {
      fontSize: "16px",
    }
  }

  _sProposalWrap() {
    return {

    }
  }

  render() {
    const byDay = _.groupBy(this.props.proposals, (p) => {
      return moment.unix(p.start).dayOfYear()
    })
    const renderedByDay = _.map(byDay, (ps, dayNum) => {
      const header = moment().dayOfYear(dayNum).format("ddd, MMM D")
      return (
        <div className="proposal-day" key={dayNum}>
          <div className="day-header">{header}</div>
          <div className="proposals">
            {this._renderProposalsForDay(ps)}
          </div>
        </div>
      )
    })
    return (
      <div id="proposed-time-list" style={this._sProposalTimeList()}>
        {this._renderHeader()}
        <div className="proposals-wrap">
          {renderedByDay}
        </div>
      </div>
    )
  }
}
