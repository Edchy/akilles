import { Composition } from "remotion";

import { Onboarding, FPS, filmFrames } from "./Onboarding";

export const Root = () => (
  <Composition
    id="Onboarding"
    component={Onboarding}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={filmFrames()}
  />
);
