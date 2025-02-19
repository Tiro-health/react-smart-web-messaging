import useScratchpad, { Resource } from "#lib/useScratchpad.tsx";
import "./App.css";
import { useCallback, useMemo, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
const INITIAL_RESOURCE: Resource = {
  resourceType: "QuestionnaireResponse",
  questionnaire: "http://example.org/my-questionnaire-123",
  status: "in-progress",
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
      <div>
        <h2>SMART App</h2>
        <div>
          <button type="button" onClick={handleSend}>
            Send
          </button>
          <strong>{status}</strong>
        </div>
        <Editor
          height="90vh"
          defaultLanguage="json"
          defaultValue={jsonResource}
          onMount={handleEditorDidMount}
        />
      </div>
    </>
  );
}

export default App;
