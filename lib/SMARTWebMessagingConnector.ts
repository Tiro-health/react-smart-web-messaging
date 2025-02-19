type Options = {
  autoInitialize?: boolean;
};

type SMARTMessagingParams = {
  origin: string;
  handle: string;
};

type RequestMessage = {
  messagingHandle: string;
  messageId: string;
  messageType: string;
  payload: Record<string, unknown>;
};

type ResponseMessage = {
  messageId: string;
  responseToMessageId: string;
  additionalResponseExpected?: boolean;
  payload: Record<string, unknown>;
};

export class SMARTWebMessagingConnector {
  private _isInitialized: boolean;
  private _status: "connecting" | "ready" | "unconnected";
  public readonly params: SMARTMessagingParams;
  public readonly window: Window;
  constructor(
    window: Window,
    params: SMARTMessagingParams,
    options: Options = {},
  ) {
    this._isInitialized = false;
    this._status = "unconnected";
    console.debug(
      `Creating connector with handle='${params.handle}' for origin='${params.origin}'`,
    );
    this.params = params;
    this.window = window;
    if (options.autoInitialize) {
      this.initialize();
    }
  }
  get isInitialized() {
    return this._isInitialized;
  }
  static generateMessageId() {
    return Math.random().toString(36).substring(2, 15);
  }
  public async ensureInitialized() {
    console.debug("Ensure connection is established.");
    if (!this._isInitialized) {
      await this.initialize();
    }
  }
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
      const resonseHandler = (event: MessageEvent) => {
        const response = event.data as ResponseMessage & TResponseMessage;
        if (response.responseToMessageId === messageId) {
          resolve(response);
          if (!response.additionalResponseExpected)
            this.window.removeEventListener("message", resonseHandler);
        }
      };
      this.window.postMessage(message, this.params.origin);
      this.window.addEventListener("message", resonseHandler);
    });
  }
  async initialize() {
    if (this._status == "connecting") return;
    console.debug("Establishing connection.");
    this._status = "connecting";
    await this.sendMessage("status.handshake");
    this._status = "ready";
    this._isInitialized = true;
    console.debug("Connection established.");
  }
  close() {
    this.sendMessage("ui.close");
  }
}
