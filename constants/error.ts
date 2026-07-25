export class CustomError<T> extends Error {
  data: T;
  constructor(
    message: string,
    public override name: string,
    data?: T
  ) {
    super(message);
    this.data = data as T;
  }
}
