import '../assets/MessagePaneContainer.css';
import Pane from './Pane';
import Tile from './Tile';

interface MessagePaneContainerProps {
  children?: React.ReactNode;
}

export function MessagePaneContainer(props: MessagePaneContainerProps) {
  return (
    <div className="messagePaneContainer">
      <Pane style={{minHeight: 201}}>
        <div className="tile_container_common tile_container_full messageTileContainer">
          <Tile omitHeader={true} style={{minHeight: 200}}>
            <div className="messageContainer">{props.children}</div>
          </Tile>
        </div>
      </Pane>
    </div>
  );
}
