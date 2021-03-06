// tslint:disable-next-line:no-var-requires
const spinner = require<string>("assets/spinner.gif");

import _ from "lodash";
import React from "react";

import * as protos from "src/js/protos";
import { FixLong } from "src/util/fixLong";
import Print from "src/views/reports/containers/range/print";
import Loading from "src/views/shared/components/loading";
import { TimestampToMoment } from "src/util/convert";

interface LogTableProps {
  rangeID: Long;
  log: protos.cockroach.server.serverpb.RangeLogResponse$Properties;
  lastError: Error;
}

function printLogEventType(eventType: protos.cockroach.storage.RangeLogEventType) {
  switch (eventType) {
    case protos.cockroach.storage.RangeLogEventType.add: return "Add";
    case protos.cockroach.storage.RangeLogEventType.remove: return "Remove";
    case protos.cockroach.storage.RangeLogEventType.split: return "Split";
    default: return "Unknown";
  }
}

export default class LogTable extends React.Component<LogTableProps, {}> {
  // If there is no otherRangeID, it comes back as the number 0.
  renderRangeID(otherRangeID: Long | number) {
    const fixedOtherRangeID = FixLong(otherRangeID);
    const fixedCurrentRangeID = FixLong(this.props.rangeID);
    if (fixedOtherRangeID.eq(0)) {
      return null;
    }

    if (fixedCurrentRangeID.eq(fixedOtherRangeID)) {
      return `r${fixedOtherRangeID.toString()}`;
    }

    return (
      <a href={`#/reports/range/${fixedOtherRangeID.toString()}`}>
        r{fixedOtherRangeID.toString()}
      </a>
    );
  }

  renderLogInfoDescriptor(
    title: string, desc: string,
  ) {
    if (_.isEmpty(desc)) {
      return null;
    }
    return (
      <li>
        {title}: {desc}
      </li>
    );
  }

  renderLogInfo(info: protos.cockroach.server.serverpb.RangeLogResponse.PrettyInfo$Properties) {
    return (
      <ul className="log-entries-list">
        {this.renderLogInfoDescriptor("Updated Range Descriptor", info.updated_desc)}
        {this.renderLogInfoDescriptor("New Range Descriptor", info.new_desc)}
        {this.renderLogInfoDescriptor("Added Replica", info.added_replica)}
        {this.renderLogInfoDescriptor("Removed Replica", info.removed_replica)}
        {this.renderLogInfoDescriptor("Reason", info.reason)}
        {this.renderLogInfoDescriptor("Details", info.details)}
      </ul>
    );
  }

  render() {
    const { log, lastError } = this.props;

    if (!_.isEmpty(lastError)) {
      return (
        <div>
          <h2>Range Log</h2>
          There was an error retrieving the range log:
          {lastError}
        </div>
      );
    }

    // Sort by descending timestamp.
    const events = _.orderBy(log && log.events, event => TimestampToMoment(event.event.timestamp).valueOf(), "desc");

    return (
      <div>
        <h2>Range Log</h2>
        <Loading
          loading={_.isNil(log)}
          className="loading-image loading-image__spinner-left"
          image={spinner}
        >
          <table className="log-table">
            <tbody>
              <tr className="log-table__row log-table__row--header">
                <th className="log-table__cell log-table__cell--header">Timestamp</th>
                <th className="log-table__cell log-table__cell--header">Store</th>
                <th className="log-table__cell log-table__cell--header">Event Type</th>
                <th className="log-table__cell log-table__cell--header">Range</th>
                <th className="log-table__cell log-table__cell--header">Other Range</th>
                <th className="log-table__cell log-table__cell--header">Info</th>
              </tr>
              {
                _.map(events, (event, key) => (
                  <tr key={key} className="log-table__row">
                    <td className="log-table__cell log-table__cell--date">
                      {Print.Timestamp(event.event.timestamp)}
                    </td>
                    <td className="log-table__cell">s{event.event.store_id}</td>
                    <td className="log-table__cell">{printLogEventType(event.event.event_type)}</td>
                    <td className="log-table__cell">{this.renderRangeID(event.event.range_id)}</td>
                    <td className="log-table__cell">
                      {this.renderRangeID(event.event.other_range_id)}
                    </td>
                    <td className="log-table__cell">{this.renderLogInfo(event.pretty_info)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Loading>
      </div>
    );
  }
}
