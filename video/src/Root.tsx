import { Composition } from "remotion";

import { Onboarding, FPS, sceneFrames } from "./Onboarding";
import { SCENES } from "./script";

export const Root = () => (
  <Composition
    id="Onboarding"
    component={Onboarding}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={SCENES.reduce((sum, s) => sum + sceneFrames(s.id), 0)}
  />
);
