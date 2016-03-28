import _ from 'underscore'
import moment from 'moment'
import React from 'react'
import {RetinaImg} from 'nylas-component-kit'

export default class ProposedTimeList extends React.Component {
  static displyName = "ProposedTimeList";

  static propTypes = {
    draft: React.PropTypes.object,
    inEmail: React.PropTypes.bool,
    proposals: React.PropTypes.array.isRequired,
  }

  static defaultProps = {
    draft: {},
    inEmail: false,
  }

  // _renderProposalsForDay(proposalsForDay) {
  //   return proposalsForDay.map((p) => {
  //     return (
  //       <div className="proposal" key={p.start}>
  //         {this._renderProposalTimeText(p)}
  //       </div>
  //     )
  //   })
  // }

  _renderHeaderInEmail() {
    const styles = {
      fontSize: "16px",
      fontWeight: 400,
      margin: "0 10px 15px 10px",
    }
    return (
      <div>
        <h2 style={styles}>
          {((this.props.draft.events || [])[0] || {}).title || this.props.draft.subject}
        </h2>
        <span style={{margin: "0 10px"}}>
          Select a time to schedule instantly:
        </span>
      </div>
    )
  }

  _renderHeaderInCard() {
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
        position: "relative",
      }
    }
    return {
      display: "block",
      position: "relative",
    }
  }

  _sProposalWrap() {
    return {

    }
  }

  // _renderByDay() {
  //   const renderedByDay = _.map(this._proposalsByDay(), (ps, dayNum) => {
  //     const header = this._headerTextFromDay(dayNum)
  //     return (
  //       <div className="proposal-day" key={dayNum}>
  //         <div className="day-header">{header}</div>
  //         <div className="proposals">
  //           {this._renderProposalsForDay(ps)}
  //         </div>
  //       </div>
  //     )
  //   });
  //
  //   return renderedByDay
  // }

  _proposalsByDay() {
    return _.groupBy(this.props.proposals, (p) => {
      return moment.unix(p.start).dayOfYear()
    })
  }

  _sProposalTable() {
    return {
      width: "100%",
      textAlign: "center",
    }
  }

  _sTD() {
    return {
      padding: "0 10px",
    }
  }

  _sTH() {
    return Object.assign({}, this._sTD(), {
      fontSize: "12px",
      color: "#333333",
      textTransform: "uppercase",
      fontWeight: 400,
    });
  }

  _sTDInner(isLast) {
    const styles = {
      borderBottom: "1px solid rgba(0,0,0,0.15)",
      borderRight: "1px solid rgba(0,0,0,0.15)",
      borderLeft: "1px solid rgba(0,0,0,0.15)",
      padding: "10px 5px",
    }
    if (isLast) {
      styles.borderRadius = "0 0 4px 4px";
    }
    return styles
  }

  _sTHInner() {
    return Object.assign({}, this._sTDInner(), {
      borderTop: "1px solid rgba(0,0,0,0.15)",
      borderRadius: "4px 4px 0 0",
    });
  }

  _renderProposalTable() {
    const byDay = this._proposalsByDay();
    let maxLen = 0;
    _.each(byDay, (ps) => {
      maxLen = Math.max(maxLen, ps.length)
    });

    const trs = []
    for (let i = -1; i < maxLen; i++) {
      const tds = []
      for (const dayNum in byDay) {
        if ({}.hasOwnProperty.call(byDay, dayNum)) {
          if (i === -1) {
            tds.push(
              <th key={dayNum} style={this._sTH()}>
                <div style={this._sTHInner()}>
                  {this._headerTextFromDay(dayNum)}
                </div>
              </th>
            )
          } else {
            const proposal = byDay[dayNum][i]
            if (proposal) {
              const isLast = (i === maxLen - 1) || !byDay[dayNum][i + 1]

              let timeText;
              if (this.props.inEmail) {
                const url = `https://quickschedule.nylas.com/${proposal.id}`
                timeText = (
                  <a href={url}>
                    {this._renderProposalTimeText(proposal)}
                  </a>
                )
              } else {
                timeText = this._renderProposalTimeText(proposal)
              }

              tds.push(
                <td key={proposal.id} style={this._sTD()}>
                  <div style={this._sTDInner(isLast)}>{timeText}</div>
                </td>
              )
            } else {
              tds.push(
                <td key={i + dayNum} style={this._sTD()}></td>
              )
            }
          }
        }
      }
      trs.push(
        <tr key={i}>{tds}</tr>
      )
    }

    return <table style={this._sProposalTable()}>{trs}</table>
  }

  _renderProposalTimeText(proposal) {
    const start = moment.unix(proposal.start).format("LT")
    const end = moment.unix(proposal.end).add(1, 'second').format("LT")
    return `${start} — ${end}`
  }

  _headerTextFromDay(dayNum) {
    return moment().dayOfYear(dayNum).format("ddd, MMM D")
  }

  _sProposalsWrap() {
    const styles = {
      margin: "10px 0",
    }
    if (!this.props.inEmail) { styles.paddingLeft = "48px"; }
    return styles
  }

  render() {
    let header;

    if (this.props.inEmail) {
      header = this._renderHeaderInEmail()
    } else {
      header = this._renderHeaderInCard()
    }

    return (
      <div style={this._sProposalTimeList()}>
        {header}
        <div style={this._sProposalsWrap()}>
          {this._renderProposalTable()}
        </div>
      </div>
    )
  }
}
