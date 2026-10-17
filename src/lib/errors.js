/** Error with an HTTP status and a stable machine-readable code. */
export class AppError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} code stable code (also used as an i18n key by the UI)
   * @param {string} message developer-facing message
   * @param {Record<string, string>} [fields] field name -> i18n key
   */
  constructor(status, code, message, fields) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
