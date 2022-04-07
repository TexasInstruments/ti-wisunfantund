/* eslint-disable camelcase */

/**
 * Wfantund status codes
 */
const WFANTUND_STATUS = {
  Ok: 0,
  Failure: 1,
  InvalidArgument: 2,
  InvalidWhenDisabled: 3,
  InvalidForCurrentState: 4,
  InvalidType: 5,
  InvalidRange: 6,
  Timeout: 7,
  SocketReset: 8,
  Busy: 9,
  Already: 10,
  Canceled: 11,
  InProgress: 12,
  TryAgainLater: 13,
  FeatureNotSupported: 14,
  FeatureNotImplemented: 15,
  PropertyNotFound: 16,
  PropertyEmpty: 17,
  JoinFailedUnknown: 18,
  JoinFailedAtScan: 19,
  JoinFailedAtAuthenticate: 20,
  FormFailedAtScan: 21,
  NCP_Crashed: 22,
  NCP_Fatal: 23,
  NCP_InvalidArgument: 24,
  NCP_InvalidRange: 25,
  MissingXPANID: 26,
  NCP_Reset: 27,
  InterfaceNotFound: 28,
  JoinerFailed_Security: 29,
  JoinerFailed_NoPeers: 30,
  JoinerFailed_ResponseTimeout: 31,
  JoinerFailed_Unknown: 32,
  NCPError_First: 0xea0000,
  NCPError_Last: 0xeaffff,
};

module.exports = {WFANTUND_STATUS};
