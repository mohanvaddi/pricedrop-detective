export class CustomError<T> extends Error {
  data: T;
  constructor(
    message: string,
    name: string,
    data?: T
  ) {
    super(message);
    this.name = name;
    this.data = data as T;
  }
}
