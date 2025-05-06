import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./App.css";

function App() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [messagingHandle, setMessagingHandle] = useState("test");
  const [ehrOrigin, setEhrOrigin] = useState(window.location.origin);
  const [appUrl, setAppUrl] = useState<URL>(
    new URL("app.html", window.location.origin),
  );
  const [resource, setResource] = useState(null);

  const iframeSrc = useMemo(() => {
    const params = appUrl.searchParams;
    params.set("messagingHandle", messagingHandle);
    params.set("targetOrigin", ehrOrigin);
    return appUrl.href;
  }, [ehrOrigin, appUrl, messagingHandle]);

  const messagingHandleIsValid = useCallback(
    (handle: string) => {
      return handle == messagingHandle;
    },
    [messagingHandle],
  );

  useEffect(() => {
    console.debug("Loading EHR host.");
    const callback = (event: MessageEvent) => {
      if (event.origin !== appUrl.origin) {
        return; // Ignore unknown origins.
      }
      // Verify the provided messaging handle is valid.
      if (!messagingHandleIsValid(event.data.messagingHandle)) {
        return; // Or handle the error some other way.
      }
      // Handle a status.handshake request.
      if (event.data.messageType === "status.handshake") {
        console.debug("Received handshake request.");
        const responseMessage = {
          messageId: Math.random().toString(36).substring(2, 15),
          responseToMessageId: event.data.messageId,
          payload: {},
        };
        setTimeout(() => {
          event.source!.postMessage(responseMessage, {
            targetOrigin: event.origin,
          });
        }, 800);
        console.debug(
          "Handshake response sent.",
          responseMessage,
          event.origin,
        );
      }
      if (
        ["scratchpad.create", "scratchpad.update"].includes(
          event.data.messageType,
        )
      ) {
        setResource(event.data.payload.resource);
      }
    };
    window.addEventListener("message", callback);
    return () => {
      window.removeEventListener("message", callback);
    };
  }, [appUrl, messagingHandleIsValid]);

  return (
    <>
      <div className="mt-4 px-10">
        <div>
          <h2 className="text-2xl">EHR</h2>
          <form
            className="flex flex-col gap-1 w-fit"
            onSubmit={(event) => {
              const formData = new FormData(event.currentTarget);
              setMessagingHandle(formData.get("messagingHandle") as string);
              setAppUrl(new URL(formData.get("appUrl") as string));
              setEhrOrigin(formData.get("ehrOrigin") as string);
              event.preventDefault();
            }}
          >
            <div>
              <label className="text-xs">
                Messaging Handle
                <input
                  type="text"
                  name="messagingHandle"
                  className="border border-gray-400 rounded-sm ml-2 text-sm px-1 py-0.5"
                  defaultValue={messagingHandle}
                />
              </label>
            </div>
            <div>
              <label className="text-xs">
                EHR Origin
                <input
                  type="text"
                  name="ehrOrigin"
                  className="border border-gray-400 rounded-sm ml-2 text-sm px-1 py-0.5"
                  defaultValue={window.location.origin}
                  size={100}
                />
              </label>
            </div>
            <div>
              <label className="text-xs">
                App URL
                <input
                  type="text"
                  name="appUrl"
                  className="border border-gray-400 rounded-sm ml-2 text-sm px-1 py-0.5"
                  defaultValue={appUrl.href}
                  size={100}
                />
              </label>
            </div>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              submit
            </button>
          </form>
          <div className="mt-4 prose">
            <pre>{JSON.stringify(resource, undefined, 4)}</pre>
          </div>
        </div>
      </div>
      <div className="app panel">
        <iframe ref={frameRef} src={iframeSrc}></iframe>
      </div>
    </>
  );
}

export default App;
