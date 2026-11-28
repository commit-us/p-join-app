export class ScheduleError extends Error {
  constructor(code, status, details = {}) {
    super(code);
    this.name = 'ScheduleError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
