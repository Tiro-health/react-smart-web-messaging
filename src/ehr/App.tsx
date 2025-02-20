import { useCallback, useEffect, useMemo, useState } from "react";

import "./App.css";

function App() {
  const [messagingHandle, setMessagingHandle] = useState("test");
  const [appOrigin, setAppOrigin] = useState<string>(window.location.origin);

  const launchparams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("messagingHandle", messagingHandle);
    params.set("targetOrigin", appOrigin);
    return params;
  }, [appOrigin, messagingHandle]);
  const [resource, setResource] = useState(null);

  const messagingHandleIsValid = useCallback(
    (handle: string) => {
      return handle == messagingHandle;
    },
    [messagingHandle],
  );

  useEffect(() => {
    console.debug("Loading EHR host.");
    const callback = (event: MessageEvent) => {
      if (event.origin !== appOrigin) {
        return; // Ignore unknown origins.
      }
      // Verify the provided messaging handle is valid.
      if (!messagingHandleIsValid(event.data.messagingHandle)) {
        return; // Or handle the error some other way.
      }
      // Handle a status.handshake request.
      if (event.data.messageType === "status.handshake") {
        console.debug("Received handshake request.");
        event.source!.postMessage(
          {
            messageId: Math.random().toString(36).substring(2, 15),
            responseToMessageId: event.data.messageId,
            payload: {},
          },
          { targetOrigin: event.origin },
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
  }, [appOrigin, messagingHandleIsValid]);

  return (
    <>
      <div className="ehr">
        <div>
          <h2>EHR</h2>
          <form
            onSubmit={(event) => {
              const formData = new FormData(event.currentTarget);
              setMessagingHandle(formData.get("messagingHandle") as string);
              setAppOrigin(formData.get("appOrigin") as string);
              event.preventDefault();
            }}
          >
            <div>
              <label>
                Messaging Handle
                <input
                  type="text"
                  name="messagingHandle"
                  defaultValue={messagingHandle}
                />
              </label>
            </div>
            <div>
              <label>
                EHR Origin
                <input
                  type="text"
                  name="ehrOrigin"
                  defaultValue={window.location.origin}
                />
              </label>
            </div>
            <div>
              <label>
                App Origin
                <input type="text" name="appOrigin" defaultValue={appOrigin} />
              </label>
            </div>
            <button type="submit">submit</button>
          </form>
          <pre>{JSON.stringify(resource, undefined, 4)}</pre>
        </div>
      </div>
      <div className="app panel">
        <iframe src={`app.html?${launchparams}`}></iframe>
      </div>
    </>
  );
}

export default App;
