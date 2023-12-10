import { useState } from "react";

function App() {
  const [date] = useState(new Date());

  return (
    <>
      <p className="font-mono font-bold p-2">{date.toString()}</p>
      <p className="px-2 font-mono text-2xl font-bold text-sky-400 py-2 mb-2">
        {date.toLocaleString("en-US", {
          month: "long",
        })}
      </p>
    </>
  );
}

export default App;
