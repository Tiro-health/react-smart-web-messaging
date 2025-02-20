import { WebView } from "./webview2";

/**
 * Options for configuring the SMART Web Messaging connector
 */
type Options = {
  autoInitialize?: boolean;
  timeoutMs: number;
  maxRetries: number;
};

/**
 * Parameters required for SMART Web Messaging
 */
type SMARTMessagingParams = {
  origin: string;
  handle: string;
};

/**
 * Structure of an outgoing request message
 */
type RequestMessage = {
  messagingHandle: string;
  messageId: string;
  messageType: string;
  payload: Record<string, unknown>;
};

/**
 * Structure of an incoming response message
 */
type ResponseMessage = {
  messageId: string;
  responseToMessageId: string;
  additionalResponseExpected?: boolean;
  payload: Record<string, unknown>;
};

/**
 * Wraps a promise with a timeout that rejects if the operation takes too long
 */
function withTimeout<T>(promise: Promise<T>, ms: number) {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Operation timed out after ${ms} ms`)),
      ms,
    ),
  );
  return Promise.race([promise, timeout]);
}

/**
 * Possible connection states for the messaging connector
 */
export type Status = "connecting" | "connected" | "disconnected" | "error";

/**
 * Handles SMART Web Messaging communication between windows/frames
 */
export class SMARTWebMessagingConnector {
  private _status: Status;
  private _listeners: {
    statusChange: Set<(status: Status) => void>;
  };
  private _pendingHandshake: Promise<unknown> | null;
  public readonly options: Options;
  public readonly params: SMARTMessagingParams;
  public readonly ehrWindow: Window | WebView;

  /**
   * Creates a new SMART Web Messaging connector instance
   */
  constructor(
    window: Window,
    params: SMARTMessagingParams,
    options: Options = { timeoutMs: 500, maxRetries: 3 },
  ) {
    this._status = "disconnected";
    this._listeners = {
      statusChange: new Set(),
    };
    this._pendingHandshake = null;
    console.debug(
      `Creating connector with handle='${params.handle}' for origin='${params.origin}'`,
    );
    this.params = params;
    this.ehrWindow = window;
    this.options = options;
    if (options.autoInitialize) {
      this.connectWithRetry();
    }
  }

  /**
   * Checks if connection is in 'connected' state
   */
  get isConnectionReady() {
    return this.status == "connected";
  }

  /**
   * Generates a random message ID
   */
  static generateMessageId() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Ensures connection is initialized before proceeding
   */
  public async ensureConnection() {
    console.debug("Ensure connection is established.");
    if (this.status != "connected") {
      await this.connectWithRetry();
    }
    if (this.status == "error") {
      throw new Error("Connection error");
    }
  }

  /**
   * Adds a status change event listener
   */
  public addEventListener(
    type: "statusChange",
    listener: (status: Status) => void,
  ) {
    this._listeners[type].add(listener);
  }

  /**
   * Removes a status change event listener
   */
  public removeEventListener(
    type: "statusChange",
    listener: (status: Status) => void,
  ) {
    return this._listeners[type].delete(listener);
  }

  /**
   * Updates connection status and notifies listeners
   */
  private setStatus(status: Status) {
    this._status = status;
    this._listeners["statusChange"].forEach((listener) => listener(status));
  }

  /**
   * Sends a message and waits for response
   */
  public async sendMessage<
    TRequestMessage extends Pick<RequestMessage, "messageType" | "payload">,
    TResponseMessage extends Pick<ResponseMessage, "payload">,
  >(
    messageType: TRequestMessage["messageType"],
    payload: TRequestMessage["payload"] = {},
  ): Promise<ResponseMessage & TResponseMessage> {
    /** Message Header */
    const messageId = SMARTWebMessagingConnector.generateMessageId();
    const messagingHandle = this.params.handle;

    return new Promise<ResponseMessage & TResponseMessage>((resolve) => {
      const message = { messageType, payload, messageId, messagingHandle };
      const resonseHandler = (event: unknown) => {
        const response = (
          event as MessageEvent<ResponseMessage & TResponseMessage>
        ).data;
        if (response.responseToMessageId === messageId) {
          resolve(response);
          if (!response.additionalResponseExpected)
            this.ehrWindow.removeEventListener("message", resonseHandler);
        }
      };
      window.addEventListener("message", resonseHandler);
      this.ehrWindow.postMessage(message, this.params.origin);
    });
  }

  async connect() {
    if (this.status == "connecting" && this._pendingHandshake) {
      return await this._pendingHandshake;
    }
    console.debug("Establishing connection.");
    this.setStatus("connecting");
    this._pendingHandshake = withTimeout(
      this.sendMessage("status.handshake"),
      this.options.timeoutMs,
    )
      .then(() => {
        this.setStatus("connected");
        console.debug("Connection established.");
      })
      .catch((reason) => {
        if (this.status !== "connecting") return;
        this.setStatus("error");
        throw reason;
      });
    await this._pendingHandshake;
  }

  async connectWithRetry() {
    let retries = 0;
    while (retries < this.options.maxRetries) {
      console.debug(`Attempt ${retries + 1} to connect`);
      try {
        await this.connect();
        return;
      } catch (error) {
        console.warn("Failed to initialize connection:", error);
      }
      retries++;
    }
    throw new Error(
      `Failed to establish connection after ${this.options.maxRetries} retries`,
    );
  }

  /**
   * Returns current connection status
   */
  get status() {
    return this._status;
  }

  /**
   * Closes the messaging connection
   */
  close() {
    this.sendMessage("ui.close");
  }
}
