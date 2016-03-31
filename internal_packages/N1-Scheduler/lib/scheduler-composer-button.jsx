import {DraftStore, React, Event, DatabaseStore, Calendar} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'

export default class SchedulerComposerButton extends React.Component {
  static displayName = "SchedulerComposerButton";

  static propTypes = {
    draftClientId: React.PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.state = {enabled: false};
    this._session = null;
    this._mounted = false;
    this._unsubscribes = [];
  }

  componentDidMount() {
    this._mounted = true;
    this.handleProps()
  }

  componentWillReceiveProps(newProps) {
    this.handleProps(newProps);
  }

  handleProps(newProps = null) {
    const props = newProps || this.props;
    DraftStore.sessionForClientId(props.draftClientId).then(session => {
      // Only run if things are still relevant: component is mounted
      // and draftClientIds still match
      const idIsCurrent = newProps ? true : this.props.draftClientId === session.draftClientId;
      if (this._mounted && idIsCurrent) {
        this._session = session;
        const unsub = session.listen(this._onDraftChange.bind(this));
        this._unsubscribes.push(unsub);
        this._onDraftChange();
      }
    });
  }

  _onDraftChange() {
    const draft = this._session.draft();
    this.setState({
      enabled: draft.events && draft.events.length > 0,
    });
  }

  _onClick = () => {
    if (!this._session) { return }
    const draft = this._session.draft()
    if (draft.events.length === 0) {  // API can only handle one event
      DatabaseStore.findAll(Calendar, {accountId: draft.accountId})
      .then((allCalendars) => {
        if (allCalendars.length === 0) {
          throw new Error(`Can't create an event. The Account \
${draft.accountId} has no calendars.`);
        }

        const cals = allCalendars.filter(c => !c.readOnly);

        if (cals.length === 0) {
          NylasEnv.showErrorDialog(`This account has no editable \
calendars. We can't create an event for you. Please make sure you have an \
editable calendar with your account provider.`);
          return;
        }

        // TODO Have a default calendar config
        const event = new Event({calendarId: cals[0].id});
        this._session.changes.add({events: [event]})
      })
    }
  }

  render() {
    return (
      <button className={`btn btn-toolbar ${this.state.enabled ? "btn-enabled" : ""}`}
        onClick={this._onClick}
        title="Add an event…"
      >
      <RetinaImg url="nylas://N1-Scheduler/assets/ic-composer-scheduler@2x.png"
        mode={RetinaImg.Mode.ContentIsMask}
      />
    </button>)
  }
}
