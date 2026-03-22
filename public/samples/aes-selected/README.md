# AES Selected Audio Layout

This directory contains the fixed 15-item selected set copied from:

- [`/Users/dabinkim/Desktop/Research Projects/2026_DDSPCarSound/AES_ListeningTestset_v2`](/Users/dabinkim/Desktop/Research%20Projects/2026_DDSPCarSound/AES_ListeningTestset_v2)

Fixed source item IDs:

`000, 023, 024, 031, 041, 052, 080, 091, 095, 099, 102, 104, 112, 172, 179`

Directory format:

```text
public/samples/aes-selected/
  stage1/
    item01/
      ground_truth.wav
      reference_test.wav
      c2_direct.wav
      c1_direct.wav
      c2_encoder.wav
      c1_encoder.wav
    ...
    item15/
      ...
  stage2/
    item01/
      ground_truth.wav
      reference_test.wav
      c1_direct_rpm.wav
      c1_encoder_rpm.wav
      c1_direct_rpm_pedal_gear.wav
      c1_encoder_rpm_pedal_gear.wav
      c1_direct_full.wav
      c1_encoder_full.wav
    ...
    item15/
      ...
```

Source to target mapping:

- Stage 1 `reference_test.wav` <- `TestA_00_Reference_Test.wav`
- Stage 1 `c2_direct.wav` <- `TestA_01_C2_Direct.wav`
- Stage 1 `c1_direct.wav` <- `TestA_02_C1_Direct.wav`
- Stage 1 `c2_encoder.wav` <- `TestA_03_C2_Encoder.wav`
- Stage 1 `c1_encoder.wav` <- `TestA_04_C1_Encoder.wav`
- Stage 2 `reference_test.wav` <- `TestB_00_Reference_Test.wav`
- Stage 2 `c1_direct_rpm.wav` <- `TestB_01_C1_Direct_RPM.wav`
- Stage 2 `c1_encoder_rpm.wav` <- `TestB_02_C1_Encoder_RPM.wav`
- Stage 2 `c1_direct_rpm_pedal_gear.wav` <- `TestB_03_C1_Direct_RPM,PedalPosition,GearLevel.wav`
- Stage 2 `c1_encoder_rpm_pedal_gear.wav` <- `TestB_04_C1_Encoder_RPM,PedalPosition,GearLevel.wav`
- Stage 2 `c1_direct_full.wav` <- `TestB_05_C1_Direct_RPM,PedalPosition,GearLevel,Velocity,Acceleration.wav`
- Stage 2 `c1_encoder_full.wav` <- `TestB_06_C1_Encoder_RPM,PedalPosition,GearLevel,Velocity,Acceleration.wav`
