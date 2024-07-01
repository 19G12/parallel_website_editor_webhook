import React, { useEffect, useState } from "react";
import { Navbar, NavbarBrand, UncontrolledTooltip } from "reactstrap";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { DefaultEditor } from "react-simple-wysiwyg";
import Avatar from "react-avatar";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import "./App.css";

const WS_URL = "ws://127.0.0.1:8000";

function isUserEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === "usertype";
}

function isDocumentEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === "contentype";
}

function isClosingEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === "closetype";
}

function App() {
  const [username, setUsername] = useState(null);
  const { sendJsonMessage, readyState } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log("WebSocket connection established.");
    },
    share: true,
    filter: () => false,
    retryOnError: true,
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (username && readyState === ReadyState.OPEN) {
      sendJsonMessage({
        username,
        type: "usertype",
      });
    }
  }, [username, sendJsonMessage, readyState]);
  return (
    <>
      <Navbar color="light" light>
        <NavbarBrand href="/">Real-time document editor</NavbarBrand>
      </Navbar>
      <div className="container-fluid">
        {username ? (
          <EditorSection onLogin={setUsername} />
        ) : (
          <LoginSection onLogin={setUsername} />
        )}
      </div>
    </>
  );
}

function LoginSection({ onLogin }) {
  const [username, setUsername] = useState("");
  useWebSocket(WS_URL, {
    share: true,
    filter: () => false,
  });
  function logInUser() {
    if (!username) {
      return;
    }
    onLogin && onLogin(username);
  }

  return (
    <div className="account">
      <div className="account__wrapper">
        <div className="account__card">
          <div className="account__profile">
            <p className="account__name">Hello, user!</p>
            <p className="account__sub">Join to edit the document</p>
          </div>
          <input
            name="username"
            onInput={(e) => setUsername(e.target.value)}
            className="form-control"
          />
          <button
            type="button"
            onClick={() => logInUser()}
            className="btn btn-primary account__btn"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

function History({ message }) {
  console.log("history");
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent,
  });
  const activities = lastJsonMessage?.data.userActivity || [];
  activities && message(activities[activities.length - 1]);

  return (
    <ul>
      {activities.map((activity, index) => (
        <li key={`activity-${index}`}>{activity}</li>
      ))}
    </ul>
  );
}

function Users() {
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent,
  });
  const users = Object.values(lastJsonMessage?.data.users || {});
  return users.map((user) => (
    <div key={user.username}>
      <span id={user.username} className="userInfo" key={user.username}>
        <Avatar name={user.username} size={40} round="20px" />
      </span>
      <UncontrolledTooltip placement="top" target={user.username}>
        {user.username}
      </UncontrolledTooltip>
    </div>
  ));
}

function EditorSection({ onLogin }) {
  const [message, setMessage] = useState(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(true);
  
  console.log(message);
  
  useEffect(() => {
    setOpen(true);
    message && message.includes('left the document') && setType(false);
  }, [message]);

  return (
    <div className="main-content">
      <Snackbar
        autoHideDuration={3000}
        open={open}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setOpen(false)}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={type ? "success" : "error"}
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>

      <div className="document-holder">
        <div className="currentusers">
          <Users />
        </div>
        <Document />
      </div>
      <div className="history-holder">
        <History message={setMessage} doOpen={setOpen} />
      </div>
      <div className="close-connection">
        <CloseConnection setNull={onLogin} />
      </div>
    </div>
  );
}

function CloseConnection({ setNull }) {
  const { sendJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isClosingEvent,
  });

  function sendClose() {
    setNull(null);
    sendJsonMessage({
      type: "closetype",
    });
  }

  return <div onClick={sendClose}> Close connection</div>;
}

function Document() {
  const { lastJsonMessage, sendJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isDocumentEvent,
  });

  let html = lastJsonMessage?.data.editorContent || "";
  console.log(html, "backend");
  function handleHtmlChange(e) {
    sendJsonMessage({
      type: "contentype",
      content: e.target.value,
    });
  }

  return <DefaultEditor value={html} onChange={handleHtmlChange} />;
}

export default App;
