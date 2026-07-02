// ---------------------------------------------------------------------------
// WorldDistricts — the outer ring of the enlarged map. Four themed districts
// (Woods W, Lakeside S, Fairground E, Downtown N) plus the roads that connect
// each one back to the town's cardinal crosswalks, so the bigger world reads as
// a place you travel through rather than an empty field.
//
// Rendered OUTSIDE the camera-collision propsRef group on purpose: these distant
// props shouldn't bloat the per-frame camera raycast in town.
// ---------------------------------------------------------------------------
import { Road } from "./worldProps";
import { ProximityHtml } from "./worldLabels";
import { RoadsideScenery } from "./RoadsideScenery";
import { WoodsDistrict } from "./districtWoods";
import { LakesideDistrict } from "./districtLakeside";
import { FairgroundDistrict } from "./districtFairground";
import { DowntownDistrict } from "./districtDowntown";

const ROAD = "#e4d3ad";

export function WorldDistricts() {
  return (
    <group>
      {/* Connectors from the town edge (~±24) out to each district. */}
      <Road from={[0, -24]} to={[0, -42]} width={6} color={ROAD} />
      <Road from={[0, 24]} to={[0, 42]} width={6} color={ROAD} />
      <Road from={[24, 0]} to={[42, 0]} width={6} color={ROAD} />
      <Road from={[-24, 0]} to={[-42, 0]} width={6} color={ROAD} />

      {/* Countryside filling the open mid-ring + corners, and roadside lamps/trees. */}
      <RoadsideScenery />

      {/* Name labels that fade in as a kid approaches each district entrance. */}
      <ProximityHtml position={[0, 4, -40]} radius={24} distanceFactor={13}>
        <div className="world-npc-tag">🏙️ Downtown</div>
      </ProximityHtml>
      <ProximityHtml position={[40, 4, 0]} radius={24} distanceFactor={13}>
        <div className="world-npc-tag">🎪 Fairground</div>
      </ProximityHtml>
      <ProximityHtml position={[0, 4, 40]} radius={24} distanceFactor={13}>
        <div className="world-npc-tag">🏖️ Lakeside</div>
      </ProximityHtml>
      <ProximityHtml position={[-40, 4, 0]} radius={24} distanceFactor={13}>
        <div className="world-npc-tag">🌲 Woods</div>
      </ProximityHtml>

      <DowntownDistrict />
      <FairgroundDistrict />
      <LakesideDistrict />
      <WoodsDistrict />
    </group>
  );
}
