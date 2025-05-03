/* eslint-disable @next/next/no-img-element */
import React from "react";

const DEFAULT_ZOOM_STEP = 0.3;
const DEFAULT_LARGE_ZOOM = 4;

function getXY(e: React.MouseEvent | React.TouchEvent): {
  x: number;
  y: number;
} {
  let x = 0;
  let y = 0;
  if (
    (e as React.TouchEvent).touches &&
    (e as React.TouchEvent).touches.length
  ) {
    x = (e as React.TouchEvent).touches[0].pageX;
    y = (e as React.TouchEvent).touches[0].pageY;
  } else {
    x = (e as React.MouseEvent).pageX;
    y = (e as React.MouseEvent).pageY;
  }
  return { x, y };
}

interface CondProps {
  condition: boolean;
  children: React.ReactNode;
}

function Cond(props: CondProps) {
  if (!props.condition) return null;
  return <React.Fragment>{props.children}</React.Fragment>;
}

interface LightboxProps {
  startIndex?: number;
  images?: { url: string; title?: string }[];
  image?: string;
  title?: string;
  zoomStep?: number;
  allowZoom?: boolean;
  doubleClickZoom?: number;
  onNavigateImage?: (current: number) => void;
  onClose?: (e: React.MouseEvent) => void;
  clickOutsideToExit?: boolean;
  keyboardInteraction?: boolean;
  allowRotate?: boolean;
  buttonAlign?: "flex-start" | "center" | "flex-end";
  showTitle?: boolean;
  allowReset?: boolean;
}

interface LightboxState {
  x: number;
  y: number;
  zoom: number;
  rotate: number;
  loading: boolean;
  moving: boolean;
  current: number;
  multi: boolean;
  showLightbox?: boolean;
}

export default class Lightbox extends React.Component<
  LightboxProps,
  LightboxState
> {
  initX = 0;
  initY = 0;
  lastX = 0;
  lastY = 0;
  _cont = React.createRef<HTMLDivElement>();
  state: LightboxState = {
    x: 0,
    y: 0,
    zoom: 1,
    rotate: 0,
    loading: true,
    moving: false,
    current: this.props?.startIndex ?? 0,
    multi: this.props?.images?.length ? true : false,
  };

  createTransform = (
    x: number,
    y: number,
    zoom: number,
    rotate: number
  ): string =>
    `translate3d(${x}px,${y}px,0px) scale(${zoom}) rotate(${rotate}deg)`;

  stopSideEffect = (e: React.MouseEvent): void => e.stopPropagation();

  getCurrentImage = (s: LightboxState, p: LightboxProps): string => {
    if (!s.multi) return p.image ?? "";
    return p.images![s.current]?.url ?? p.images?.[s.current] ?? "";
  };

  getCurrentTitle = (s: LightboxState, p: LightboxProps): string => {
    if (!s.multi) return p.title ?? "";
    return p.images?.[s.current]?.title ?? "";
  };

  resetZoom = (): void => this.setState({ x: 0, y: 0, zoom: 1 });

  shockZoom = (e: React.MouseEvent): void | false => {
    let {
      zoomStep = DEFAULT_ZOOM_STEP,
      allowZoom = true,
      doubleClickZoom = DEFAULT_LARGE_ZOOM,
    } = this.props;
    if (!allowZoom || !doubleClickZoom) return false;
    this.stopSideEffect(e);
    if (this.state.zoom > 1) return this.resetZoom();
    const _z =
      (zoomStep < 1 ? Math.ceil(doubleClickZoom / zoomStep) : zoomStep) *
      zoomStep;
    const _xy = getXY(e);
    const _cbr = this._cont.current?.getBoundingClientRect?.();
    const _ccx = _cbr!.x + _cbr!.width / 2;
    const _ccy = _cbr!.y + _cbr!.height / 2;
    const x = (_xy.x - _ccx) * -1 * _z;
    const y = (_xy.y - _ccy) * -1 * _z;
    this.setState({ x, y, zoom: _z });
  };

  navigateImage = (direction: string, e: React.MouseEvent): void => {
    this.stopSideEffect(e);
    let current = 0;
    switch (direction) {
      case "next":
        current = this.state.current + 1;
        break;
      case "prev":
        current = this.state.current - 1;
        break;
    }
    if (current >= this.props.images!.length) current = 0;
    else if (current < 0) current = this.props.images!.length - 1;
    this.setState({ current, x: 0, y: 0, zoom: 1, rotate: 0, loading: true });
    if (typeof this.props.onNavigateImage === "function") {
      this.props.onNavigateImage(current);
    }
  };

  startMove = (e: React.MouseEvent | React.TouchEvent): void | false => {
    if (this.state.zoom <= 1) return false;
    this.setState({ moving: true });
    let xy = getXY(e);
    this.initX = xy.x - this.lastX;
    this.initY = xy.y - this.lastY;
  };

  duringMove = (e: React.MouseEvent | React.TouchEvent): void | false => {
    if (!this.state.moving) return false;
    let xy = getXY(e);
    this.lastX = xy.x - this.initX;
    this.lastY = xy.y - this.initY;
    this.setState({
      x: xy.x - this.initX,
      y: xy.y - this.initY,
    });
  };

  endMove = (e: React.MouseEvent | React.TouchEvent): void =>
    this.setState({ moving: false });

  applyZoom = (type: string): void => {
    let { zoomStep = DEFAULT_ZOOM_STEP } = this.props;
    switch (type) {
      case "in":
        this.setState({ zoom: this.state.zoom + zoomStep });
        break;
      case "out":
        let newZoom = this.state.zoom - zoomStep;
        if (newZoom < 1) break;
        else if (newZoom === 1) this.setState({ x: 0, y: 0, zoom: 1 });
        else this.setState({ zoom: newZoom });
        break;
      case "reset":
        this.resetZoom();
        break;
    }
  };

  applyRotate = (type: string): void => {
    switch (type) {
      case "cw":
        this.setState({ rotate: this.state.rotate + 90 });
        break;
      case "acw":
        this.setState({ rotate: this.state.rotate - 90 });
        break;
    }
  };

  reset = (e: React.MouseEvent): void => {
    this.stopSideEffect(e);
    this.setState({ x: 0, y: 0, zoom: 1, rotate: 0 });
  };

  exit = (e: React.MouseEvent): void => {
    this.stopSideEffect(e);
    if (typeof this.props.onClose === "function") {
      return this.props.onClose(e);
    }
    console.warn("No onClose function provided, defaulting to hiding lightbox");
    this.setState({ showLightbox: false }); // Add a fallback state
  };

  shouldShowReset = (): boolean =>
    this.state.x !== 0 ||
    this.state.y !== 0 ||
    this.state.zoom !== 1 ||
    this.state.rotate !== 0;

  canvasClick = (e: React.MouseEvent): void => {
    let { clickOutsideToExit = true } = this.props;
    if (clickOutsideToExit && this.state.zoom <= 1) return this.exit(e);
  };

  keyboardNavigation = (e: KeyboardEvent): void => {
    let { allowZoom = true, allowReset = true } = this.props;
    let { multi, x, y, zoom } = this.state;
    switch (e.key) {
      case "ArrowLeft":
        if (multi && zoom === 1) this.navigateImage("prev", e as any);
        else if (zoom > 1) this.setState({ x: x - 20 });
        break;
      case "ArrowRight":
        if (multi && zoom === 1) this.navigateImage("next", e as any);
        else if (zoom > 1) this.setState({ x: x + 20 });
        break;
      case "ArrowUp":
        if (zoom > 1) this.setState({ y: y + 20 });
        break;
      case "ArrowDown":
        if (zoom > 1) this.setState({ y: y - 20 });
        break;
      case "+":
        if (allowZoom) this.applyZoom("in");
        break;
      case "-":
        if (allowZoom) this.applyZoom("out");
        break;
      case "Escape":
        if (allowReset && this.shouldShowReset()) this.reset(e as any);
        else this.exit(e as any);
        break;
    }
  };

  componentDidMount(): void {
    document.body.classList.add("lb-open-lightbox");
    let { keyboardInteraction = true } = this.props;
    if (keyboardInteraction)
      document.addEventListener("keyup", this.keyboardNavigation);
  }

  componentWillUnmount(): void {
    document.body.classList.remove("lb-open-lightbox");
    let { keyboardInteraction = true } = this.props;
    if (keyboardInteraction)
      document.removeEventListener("keyup", this.keyboardNavigation);
  }

  render(): React.ReactNode {
    let image = this.getCurrentImage(this.state, this.props);
    let title = this.getCurrentTitle(this.state, this.props);
    if (!image) {
      console.warn("Not showing lightbox because no image(s) was supplied");
      return null;
    }
    let {
      allowZoom = true,
      allowRotate = true,
      buttonAlign = "flex-end",
      showTitle = true,
      allowReset = true,
    } = this.props;
    let { x, y, zoom, rotate, multi, loading, moving } = this.state;
    let _reset = allowReset && this.shouldShowReset();
    return (
      <div className="lb-container">
        <div className="lb-header" style={{ justifyContent: buttonAlign }}>
          <Cond condition={Boolean(showTitle && title)}>
            <div
              className="lb-title"
              style={{
                display: buttonAlign === "center" ? "none" : "flex",
                order: buttonAlign === "flex-start" ? "2" : "unset",
              }}
            >
              <span
                title={title}
                style={{
                  textAlign: buttonAlign === "flex-start" ? "right" : "left",
                }}
              >
                {title}
              </span>
            </div>
          </Cond>
          <Cond condition={buttonAlign === "center" || _reset}>
            <div
              title="Reset"
              style={{ order: buttonAlign === "flex-start" ? "1" : "unset" }}
              className={`lb-button lb-icon-reset lb-hide-mobile reload ${
                _reset ? "" : "lb-disabled"
              }`}
              onClick={this.reset}
            ></div>
          </Cond>
          <Cond condition={multi}>
            <div
              title="Previous"
              className="lb-button lb-icon-arrow prev lb-hide-mobile"
              onClick={(e) => this.navigateImage("prev", e)}
            ></div>
            <div
              title="Next"
              className="lb-button lb-icon-arrow next lb-hide-mobile"
              onClick={(e) => this.navigateImage("next", e)}
            ></div>
          </Cond>
          <Cond condition={allowZoom}>
            <div
              title="Zoom In"
              className="lb-button lb-icon-zoomin zoomin"
              onClick={() => this.applyZoom("in")}
            ></div>
            <div
              title="Zoom Out"
              className={`lb-button lb-icon-zoomout zoomout ${
                zoom <= 1 ? "lb-disabled" : ""
              }`}
              onClick={() => this.applyZoom("out")}
            ></div>
          </Cond>
          <Cond condition={allowRotate}>
            <div
              title="Rotate left"
              className="lb-button lb-icon-rotate rotatel"
              onClick={() => this.applyRotate("acw")}
            ></div>
            <div
              title="Rotate right"
              className="lb-button lb-icon-rotate rotater"
              onClick={() => this.applyRotate("cw")}
            ></div>
          </Cond>
          <div
            title="Close"
            className="lb-button lb-icon-close close"
            style={{ order: buttonAlign === "flex-start" ? "-1" : "unset" }}
            onClick={(e) => this.exit(e)}
          ></div>
        </div>
        <div
          className={`lb-canvas${loading ? " lb-loading" : ""}`}
          ref={this._cont}
          onClick={(e) => this.canvasClick(e)}
        >
          <img
            draggable="false"
            style={{
              transform: this.createTransform(x, y, zoom, rotate),
              cursor: zoom > 1 ? "grab" : "unset",
              transition: moving ? "none" : "all 0.1s",
            }}
            onMouseDown={(e) => this.startMove(e)}
            onTouchStart={(e) => this.startMove(e)}
            onMouseMove={(e) => this.duringMove(e)}
            onTouchMove={(e) => this.duringMove(e)}
            onMouseUp={(e) => this.endMove(e)}
            onMouseLeave={(e) => this.endMove(e)}
            onTouchEnd={(e) => this.endMove(e)}
            onClick={(e) => this.stopSideEffect(e)}
            onDoubleClick={(e) => this.shockZoom(e)}
            onLoad={(e) => this.setState({ loading: false })}
            className={`lb-img${loading ? " lb-loading" : ""}`}
            title={title}
            src={image}
            alt={title}
          />
          <div className="mobile-controls lb-show-mobile">
            {multi ? (
              <div
                title="Previous"
                className="lb-button lb-icon-arrow prev"
                onClick={(e) => this.navigateImage("prev", e)}
              ></div>
            ) : null}
            {_reset ? (
              <div
                title="Reset"
                className="lb-button lb-icon-reset reload"
                onClick={this.reset}
              ></div>
            ) : null}
            {multi ? (
              <div
                title="Next"
                className="lb-button lb-icon-arrow next"
                onClick={(e) => this.navigateImage("next", e)}
              ></div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}
