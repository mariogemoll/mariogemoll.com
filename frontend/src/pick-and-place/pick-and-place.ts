// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import { initCanonicalGraspVisualization } from 'pick-and-place/src/visualizations/canonical-grasp';
import { initEpisodeReplayVisualization } from 'pick-and-place/src/visualizations/episode-replay';
import { initGraspAndLiftVisualization } from 'pick-and-place/src/visualizations/grasp-and-lift';
import { initRobotVisualization } from 'pick-and-place/src/visualizations/robot';
import {
  initRobotViewerVisualization,
  type RobotViewerConfig
} from 'pick-and-place/src/visualizations/robot-viewer';

import { el } from '../common/dom.js';

const modelOptions = {
  modelUrl: '/pick-and-place/so101.json',
  modelBasePath: '/pick-and-place'
};

const loopEpisodeUrls = Array.from(
  { length: 5 },
  (_, index) => `/pick-and-place/loop_episode_${String(index).padStart(2, '0')}.bin`
);

const robotViewerConfigs: RobotViewerConfig[] = [
  {
    label: 'UR5e',
    modelUrl: '/pick-and-place/ur5e.json',
    modelBasePath: '/pick-and-place',
    defaultJointDegrees: {
      shoulder_pan_joint: 70,
      shoulder_lift_joint: -40,
      elbow_joint: 70,
      wrist_1_joint: 68,
      wrist_2_joint: 26,
      wrist_3_joint: 70,
      gripper_right_driver_joint: 10
    }
  },
  {
    label: 'Panda',
    modelUrl: '/pick-and-place/panda.json',
    modelBasePath: '/pick-and-place',
    mirrorCameraY: true,
    defaultJointDegrees: {
      joint1: 60,
      joint2: 20,
      joint3: -110,
      joint4: -92,
      joint5: 35,
      joint6: 68,
      joint7: 62
    },
    defaultJointMillimeters: {
      finger_joint1: 30
    }
  }
];

interface VideoConfig {
  src: string;
  poster: string;
  posterHi?: string;
  width: number;
  height: number;
}

const videoConfigs: Record<string, VideoConfig> = {
  '#scripted-video-visualization': {
    src: '/pick-and-place/scripted.mp4',
    poster: '/pick-and-place/scripted_poster_lo.jpg',
    posterHi: '/pick-and-place/scripted_poster_hi.jpg',
    width: 800,
    height: 600
  },
  '#episode-grid-video-visualization': {
    src: '/pick-and-place/episode_grid.mp4',
    poster: '/pick-and-place/episode_grid.jpg',
    width: 800,
    height: 600
  },
  '#act-video-visualization': {
    src: '/pick-and-place/act.mp4',
    poster: '/pick-and-place/act_poster_lo.jpg',
    posterHi: '/pick-and-place/act_poster_hi.jpg',
    width: 720,
    height: 360
  }
};

function initVideoVisualization(container: HTMLDivElement, config: VideoConfig): void {
  const video = document.createElement('video');
  video.src = config.src;
  video.poster = config.posterHi !== undefined && window.devicePixelRatio > 1
    ? config.posterHi
    : config.poster;
  video.controls = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.width = config.width;
  video.height = config.height;
  const placeholder = container.querySelector('.placeholder');
  if (placeholder === null) {
    throw new Error('Video visualization is missing its placeholder');
  }
  placeholder.replaceWith(video);
}

function initialize(): void {
  for (const [selector, config] of Object.entries(videoConfigs)) {
    initVideoVisualization(el(document, selector) as HTMLDivElement, config);
  }
  void initRobotVisualization(
    el(document, '#robot-visualization') as HTMLDivElement, modelOptions
  );
  const robotViewersPanel = el(document, '#robot-viewers-visualization') as HTMLDivElement;
  robotViewersPanel.classList.add('robot-viewers');
  for (const config of robotViewerConfigs) {
    void initRobotViewerVisualization(robotViewersPanel, config);
  }
  void initGraspAndLiftVisualization(
    el(document, '#grasp-visualization') as HTMLDivElement, modelOptions
  );
  void initCanonicalGraspVisualization(
    el(document, '#canonical-grasp-pose-visualization') as HTMLDivElement, modelOptions
  );
  void initEpisodeReplayVisualization(
    el(document, '#scripted-episode-replay-visualization') as HTMLDivElement,
    { ...modelOptions, episodeUrls: loopEpisodeUrls }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
  });
} else {
  initialize();
}
