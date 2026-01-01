import React from "react";
import LandingHero from "../../components/organisms/LandingHero";
import LandingTrustBand from "../../components/organisms/LandingTrustBand";
import LandingPipeline from "../../components/organisms/LandingPipeline";
import LandingFeatures from "../../components/organisms/LandingFeatures";
import LandingCorrelation from "../../components/organisms/LandingCorrelation";
import LandingTransparency from "../../components/organisms/LandingTransparency";
import LandingArchitecture from "../../components/organisms/LandingArchitecture";
import LandingCTA from "../../components/organisms/LandingCTA";

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <LandingTrustBand />
      <LandingPipeline />
      <LandingFeatures />
      <LandingCorrelation />
      <LandingTransparency />
      <LandingArchitecture />
      <LandingCTA />
    </>
  );
}
