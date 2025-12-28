export default class CustomError {
  constructor(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }
}
