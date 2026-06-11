<!-- SPDX-FileCopyrightText: 2026 Mario Gemoll -->
<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# [[ page-title ]]

The [Standard Open Arm 101](https://github.com/TheRobotStudio/SO-ARM100), also called SO-101 or
SO-ARM100, is a fully open source robot arm by [The Robot Studio](https://www.therobotstudio.com/).
It consists of 3D printed plastic parts and hobby servo motors and is particularly popular as the
reference platform for [LeRobot](https://github.com/huggingface/lerobot), a robotics library and
toolkit by Hugging Face. On this page we will explore several approaches to make it solve the task
of picking up a small cube and placing it at a target.

## SO-101 anatomy

The SO-101 has 5 degrees of freedom (DOF) from its five main joints (shoulder pan, shoulder lift,
elbow flex, wrist flex, and wrist rotation) to position and orient the end effector (gripper), plus
another joint to open and close the movable jaw on the gripper:

[[ robot-visualization ]]

The visualization also shows the maximum reach of the arm (in xy space). In this project we ignore
the theoretically available additional space the robot can reach by lifting the arm all the way
backwards at the shoulder. The collision box model is a simple approximation of the real robot shape
that is used in the phyisics calculation in simulation to reduce the computational complexity.

Note that since there is no yaw joint in the wrist or elbow, the gripper position is limited to
pointing outwards from the origin at the shoulder pan joint. The robot cannot turn its wrist left or
right (yaw) like some standard 6DOF arms like the UR5E. 6DOF generally allows the end effector
(gripper) to be positioned in any pose (position and orientation) in the workspace. Some 7DOF arms,
like the Franka Emika Panda, even have an additional degree of freedom in the elbow.

[[ robot-viewers-visualization ]]

## A scripted solution

The task is simple enough to fully analyze it and devise a mechanism which tells the robot exactly
what to do, with no learning involved. In this project we want to explore different approaches to
solve the problem, so let's start with this one. As a nice side effect, it will create data that we
can then use as training data for other approaches.

The task can be split into the following subtasks:

- Move the gripper towards the cube
- Pick up the cube
- Transport the cube to the drop location
- Drop and retreat

Assuming we have privileged information (ie. we can tell where the robot, the cube and the target is
at any point in time) most parts of this are pretty straightforward using inverse kinematics (which
given a desired pose of the robot allows us to calculate what positions the joints need to be
commanded to move to). The slightly tricky bit is how to pick up the cube, especially since we're
not completely free in how we position the gripper position because of the 5DOF restriction
described in the last section.

The main mechanism is based on the idea that we position the (open) gripper such that the inside of
the  fixed jaw is aligned with one side face of the cube while it's sitting on the workspace floor,
with a 1cm margin. Then, closing the gripper will push the cube towards the fixed jaw such that we
have contact from two sides and can lift it up:

[[ grasp-visualization ]]

This is perfectly doable if the gripper can point straight down, which is the case when the cube
sits in the area described by the inner ring segment in the next visualization.  Outside that area,
since the robot cannot turn its wrist around the yaw axis, it becomes a bit more complicated. The
planner compensates by tilting the approach away from vertical — starting top-down and tilting only
as far as needed, until at the outer edge of the workspace the gripper comes in almost horizontally
— with small additional rotations around the gripper's roll axis as a fallback. Note that in this
project we don't care about which way the cube faces, so for our purposes we treat all 90-degree
rotated positions the same. Therefore we only need to consider position and up to 90 degree rotation
(-45 to 45 deviation from the robot arm plane in the visualization), and we can also restrict
ourselves to gripper positions with the camera up.

[[ canonical-grasp-pose-visualization ]]

For the drop position, we can use the same position, but at a higher z value. It would be nice to
optimize also to make the bottom of the cube parallel to the floor to prevent any
tumbling/deflection during the drop, but this led to complications in certain cases and the simpler
way of simply the grasp position at a higher z value seems to work reasonably well.

From these building blocks a full trajectory is assembled as a fixed sequence of phases: move to a
hover/pre-grasp pose a few centimeters back from the grasp, descend onto the cube in a straight
line, close the gripper, lift, carry the cube through an elevated waypoint above the target,
descend, open the gripper (the cube simply falls the last bit), and retreat.

There are some more bells and whistles in the algorithm and some adaptations that needed to be made
for certain edge cases which we glance over here.

Here we can see the whole planning mechanism in action:

[[ scripted-episode-replay-visualization ]]

## Transferring to the real robot

With the described algorithm we solved the task in most cases in simulation. How can we make it work
on a real robot? We basically have two issues to solve: We don't know where the cube is, and while
we can read the joint positions and "know where the robot is", our model of the robot will not
exactly match reality. It turns out we can tackle the former issue with computer vision, and the
latter is not so much of a problem, apart from during the approach to the grasp pose, where vision
can come to the rescue again.

We set up a system with a wrist camera as well as a slanted overhead camera. We determine the
parameters of the camera lenses, the so called "camera intrinsics", using a calibration process.

Moreover we define a quadratic workspace area. Using visual markers in the corners of the workspace
area, the exact pose of the overhead camera, ie. the "camera extrinsics", can be determined. This
could/should also be done for the wrist camera, but it's a bit more tricky since it's not at a fixed
position, and just taking the position from the 3D model seems to be good enough.

Using the overhead camera we can now locate an _AprilTagged_ cube in the scene. To input the target
position, we introduce an additional marker in the form of a black square plate. Its center is the
target.

<div class="image-row">
  <img src="/pick-and-place/setup_lo.jpg" width="600" height="450"
    srcset="/pick-and-place/setup_lo.jpg 1x, /pick-and-place/setup_hi.jpg 2x"
    alt="Photo of the setup: the robot arm on a table next to a camera mast, with AprilTag
    markers in the workspace corners, an AprilTagged cube, and a black target plate">
  <img src="/pick-and-place/setup_3d_lo.png" width="600" height="450"
    srcset="/pick-and-place/setup_3d_lo.png 1x, /pick-and-place/setup_3d_hi.png 2x"
    alt="3D rendering of the same scene: robot arm, camera mast, marked workspace, cube, and
    target plate">
</div>

So far our system is "open loop": The whole trajectory is set in the beginning, there's never any
readjustment while it's running. This works perfectly in simulation, but the "sim2real gap" becomes
apparent in the real world, especially during the grasp phase: The 3D model doesn't match the real
world exactly (in particular, the robot isn't in exactly the same spot as the forward kinematics
predict), so the gripper misses the cube in most cases.

We do two things to mitigate this. First of all, we don't plan the trajectory once and then execute
it end to end: After each of the two contact-critical sections — grasping and lifting the cube, and
lowering and releasing it — we measure the real robot's joint positions and replan the rest of the
trajectory from there. (We deliberately don't add such checkpoints before the contact happens: right
at those moments an accurate plan matters less than one might think, as we'll see in a second for
the grasp, and while in contact the joint readback itself becomes unreliable.)

Moreover, and only during the descent onto the cube, we switch from executing a planned trajectory
(which was based on the cube position as estimated from the overhead camera) to closed-loop,
position-based visual servoing (PBVS): During this phase, the cube pose is determined from the
AprilTags as detected by the __wrist__ camera (whose own pose in turn is calculated via forward
kinematics from the joint angles). The robot is then commanded to move to the grasp position
according to this source of truth, and this correction repeats many times per second until the
gripper has settled at the grasp position; then the gripper closes and lifts the cube up (and then
we replan the rest of the trajectory, as described above).

[[ scripted-video-visualization ]]

## Collecting data

We now have a scripted system that can reliably pick up the cube and place it at the target in most
cases both in simulation and reality. We can use this to generate recordings of many episodes which
we can then also use, in addition to human-generated data, as training data for imitation learning.

To make this as automatic as possible we record many episodes in a loop. At the end of each episode
the cube is at the target, so the scene needs to be reset, however picking up the cube from the
target plate and moving it to a new random starting position can be done by simply applying our
pick and place algorithm again. What the robot cannot do is move the target plate (although it would
probably be possible to add that functionality by attaching a handle to the plate or making it
bigger so that it can be pushed), and we want variety in the target positions, so human intervention
is needed every couple of episodes to move the target plate to a new spot (and also when something
goes wrong, e.g. when the cube is pushed out of reach). We combine the call to the human to move
the plate with a cautious rest period for the robot to prevent overheating.

During 4 sessions, around 500 episodes were generated.

[[ episode-grid-video-visualization ]]

## Imitation learning using ACT

Action Chunking with Transformers (ACT, [[ ref-zhao-et-al-2023 ]]) is essentially a
Transformer-based Conditional Variational Autoencoder (CVAE), so let’s first revisit autoencoders
and variational autoencoders.

An autoencoder consists of an encoder and a decoder. The encoder compresses an input (e.g. an image)
into a latent representation $z$, while the decoder reconstructs the original input from $z$.

$$
\begin{gather}
\text{data} \rightarrow z \\
z \rightarrow \text{data}
\end{gather}
$$

A Variational Autoencoder (VAE) modifies the encoder so that it predicts the parameters of a
probability distribution rather than a single latent vector:

$$
\begin{gather}
\text{data} \rightarrow \mu, \sigma \\
z \sim \mathcal{N}(\mu, \sigma^2) \\
z \rightarrow \text{data}
\end{gather}
$$

During training, the latent distribution is regularized towards a standard normal distribution
$\mathcal{N}(0,I)$. This gives the latent space useful structure: nearby latent vectors tend to
correspond to similar outputs, and new samples can be generated by drawing $z \sim \mathcal{N}(0,
I)$. For generation, the encoder isn't needed anymore during inference.

A Conditional VAE (CVAE) additionally conditions both the encoder and decoder on some known
information:

$$
\begin{gather}
\text{data}, \text{condition} \rightarrow z \\
z, \text{condition} \rightarrow \text{data}
\end{gather}
$$

For example, suppose we have a dataset of car images and use the color as the condition. The CVAE
learns to reconstruct each image while already knowing the car’s color. Consequently, the latent
variable z only needs to encode the remaining information, such as the car model, viewpoint,
background and lighting. At inference time we can specify a color (e.g. "blue"), sample $z \sim
\mathcal{N}(0,I)$, and generate different blue cars.

In ACT, this framework is used to predict action sequences from the robot's observations. The
condition consists of the camera images and current joint angles, while the target is the
demonstrated action sequence. The only departure from the standard CVAE formulation is that the
encoder ignores the camera images and only takes the joint angles together with the demonstrated
action sequence:

$$
\begin{gather}
\text{joints}, \text{action sequence} \rightarrow \mu, \sigma \\
z \sim \mathcal{N}(\mu, \sigma^2) \\
\text{images}, \text{joints}, z \rightarrow \text{action sequence}
\end{gather}
$$

The encoder is implemented as a transformer encoder with full attention across all input embeddings.
The output of the initial BERT-style CLS token gets fed into a linear layer which outputs the mean
and standard deviation from which z is sampled.

The decoder is a transformer as well, however an encoder-decoder transformer. A ResNet converts the
camera picture inputs before they enter the encoder. The decoder gets fed fixed, learned position
embeddings and uses cross attention over the encoder outputs.

<div class="architecture-figure">
  <img src="/pick-and-place/architecture.svg"
      alt="Diagram of the ACT transformer encoder and decoder architecture">
</div>

Depending on the configuration and training setup, the model predicts an action sequence of a
certain length, for example 50 steps. Simply executing all 50 actions before running the model again
on new observations would make the robot react only every 50 timesteps, resulting in jerky motion
and poor responsiveness.

Instead, ACT uses __temporal ensembling__. The policy is run at _every timestep_, producing a new
prediction for the entire future action sequence each time. Consequently, each executed action has
usually been predicted multiple times from slightly different observations.  These overlapping
predictions are combined using an exponentially weighted average, and the resulting ensemble is sent
as the command to the robot. This produces much smoother motions while still allowing the policy to
continuously adapt to new observations.

[[ act-video-visualization ]]

## Summary

We’ve explored two approaches to solving a pick-and-place task with the SO-101. First, we developed
a fully scripted solution and transferred it from simulation to the real robot using computer
vision. This enabled us to collect real-world demonstrations, which we then used to train an ACT
imitation learning policy. Additional avenues for future work include Diffusion Policy and
Vision-Language-Action (VLA) models.

[[ references ]]
