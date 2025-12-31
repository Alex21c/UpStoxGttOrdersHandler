import { useRef } from "react";
import { useEffect } from "react";
import "./logger.css";
export default function Logger({ stateLoggerData, setStateLoggerData }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // reset height so it can shrink if needed
    textarea.style.height = "auto";

    // set height based on content
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [stateLoggerData]); // runs every time new log lines are added

  function resetLogger() {
    setStateLoggerData((prevState) => []);
  }
  return (
    <div className="wrapperLogger">
      <textarea readOnly ref={textareaRef} className="logger" value={stateLoggerData.join("\n")}></textarea>
      <div>
        <button className="btn" onClick={resetLogger}>
          Reset Logger
        </button>
      </div>
    </div>
  );
}
