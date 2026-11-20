import { Composition, staticFile } from "remotion";

import { LOGO_FPS, LogoFilm, logoFrames } from "./LogoFilm";
import { Onboarding, FPS, filmFrames } from "./Onboarding";

export const Root = () => (
  <>
    <Composition
      id="Onboarding"
      component={Onboarding}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={filmFrames()}
    />
    {/* Square, to sit anywhere. Its length follows the voice: public/voice/logo.json. */}
    <Composition
      id="Logo"
      component={LogoFilm}
      width={1080}
      height={1080}
      fps={LOGO_FPS}
      durationInFrames={logoFrames(2)}
      defaultProps={{ voice: 2 }}
      calculateMetadata={async () => {
        const res = await fetch(staticFile("voice/logo.json"));
        const voice = res.ok ? (await res.json()).seconds : 2;
        return { durationInFrames: logoFrames(voice), props: { voice } };
      }}
    />
  </>
);
