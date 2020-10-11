class Spinner {
  start(): Spinner {
    return this;
  }
  succeed(): Spinner {
    return this;
  }
  fail(): Spinner {
    return this;
  }
}

export default (): Spinner => new Spinner();
