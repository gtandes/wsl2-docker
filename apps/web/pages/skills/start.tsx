import React from "react";
import { AvatarMenu } from "../../components/AvatarMenu";
import { SkillsStart } from "../../components/skills/start";

export default function SkillsStartPage() {
  return (
    <div className="min-h-screen bg-blue-50 pb-12">
      <AvatarMenu />
      <div className="container">
        <SkillsStart />
      </div>
    </div>
  );
}
