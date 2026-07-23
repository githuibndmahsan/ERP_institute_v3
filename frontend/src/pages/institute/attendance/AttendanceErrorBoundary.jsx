import { Component } from "react";

export class AttendanceErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      message: ""
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message:
        error?.message ||
        "Attendance module failed to render."
    };
  }

  componentDidCatch(error, info) {
    console.error(
      "Attendance module render error:",
      error,
      info
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="attendance-module-error">
          <h2>Attendance module error</h2>

          <p>{this.state.message}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload Attendance
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AttendanceErrorBoundary;
