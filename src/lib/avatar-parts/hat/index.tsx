import React from "react";

import Turban from "./turban";
import Beanie from "./beanie";

export default function hat(props: { color: string, style: string }): React.ReactNode {
  const { style, color } = props;
  switch (style) {
    case "beanie": return <Beanie color={color} />;
    case "turban": return <Turban color={color} />;
    case "none":
    default:
      return null;
  }
}
