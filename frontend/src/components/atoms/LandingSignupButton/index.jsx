import React from "react";
import FlexBox from "../FlexBox";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";

export default function LandingSignupButton() {
  const navigate = useNavigate();

  return (
          <FlexBox sx={{ display: "flex", gap: 1.5, mt: 1, flexWrap: "wrap" }}>
            <Button variant="contained" onClick={() => navigate("/sign-up")}>
              Upload your first dataset
            </Button>
          </FlexBox>
  )
}