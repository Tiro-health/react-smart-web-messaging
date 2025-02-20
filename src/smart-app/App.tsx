import useScratchpad, { Resource } from "#lib/useScratchpad.tsx";
import "./App.css";
import { useCallback, useMemo, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Status } from "#lib/SMARTWebMessagingConnector.ts";
const INITIAL_RESOURCE: Resource = {
  resourceType: "QuestionnaireResponse",
  questionnaire: "http://example.org/my-questionnaire-123",
  status: "in-progress",
};
const STATUS_CLASSNAMES: Record<Status, string> = {
  connected:
    "inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20",
  disconnected:
    "inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10",
  connecting:
    "inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10",
  error:
    "inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20",
};
function App() {
  const editorRef = useRef<any>(null);
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const { resource, setResource, status } = useScratchpad(INITIAL_RESOURCE);

  const handleSend = useCallback(() => {
    const jsonData = editorRef.current?.getValue();
    if (!jsonData) return;
    const resource = JSON.parse(jsonData) as typeof INITIAL_RESOURCE;
    setResource(resource);
  }, [setResource]);
  const jsonResource = useMemo(
    () => JSON.stringify(resource, null, 4),
    [resource],
  );
  return (
    <>
      <div className="mt-4 px-10">
        <h2 className="text-2xl">SMART App</h2>
        <div className="mt-2 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-600 uppercase font-bold mr-1">
              Status:
            </span>
            <strong className={STATUS_CLASSNAMES[status]}>{status}</strong>
          </div>

          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
        <Editor
          height="90vh"
          className="mt-4"
          defaultLanguage="json"
          defaultValue={jsonResource}
          onMount={handleEditorDidMount}
        />
      </div>
    </>
  );
}

export default App;
