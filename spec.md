# Fish Field Guide for Anglers — Specification

**Version:** 0.1  
**Status:** Initial specification

> **Preservation rule:** The Epic 1–6 content below is preserved exactly from the team's supplied requirements. No requirements have been added, removed, rewritten, reorganized, or reinterpreted. Existing TBD/undecided notes remain exactly where they appeared. Future changes should only be made after team approval.

# Epic 1 — User Accounts and Security

**Epic Description:**
 This epic allows users to create and access an account, remain authenticated between application sessions, sign out, manage sensitive account information, and configure security methods used to verify their identity. Actions requiring identity verification are managed as part of this epic.

## User Story 1.1 — Access the Starter Screen

**WHO:** As an unauthenticated user,
 **WHAT:** I want to be presented with options to sign in or register when I open the application,
 **WHY:** so that I can access an existing account or create a new one.

**Acceptance Criteria:**
**GIVEN** I open the application and I am not signed in,
 **WHEN** the starter screen loads,
 **THEN** I am presented with options to Sign In or Register.
 
**GIVEN** I am not signed in,
 **WHEN** I attempt to access the application's other features,
 **THEN** I am prevented from accessing them until I successfully sign in.
 
**GIVEN** I previously signed in and have not logged out,
 **WHEN** I reopen the application,
 **THEN** I remain signed in and am taken directly to the dashboard/homepage.

---

## User Story 1.2 — Register an Account

**WHO:** As a new user,
 **WHAT:** I want to register an account using my personal and login information,
 **WHY:** so that I can create an account and access the application.
 
**Acceptance Criteria:**
**GIVEN** I am registering an account,
 **WHEN** I provide a valid first name, last name, email, username, and password and the username and email are unused,
 **THEN** my account is successfully created.
 
**GIVEN** one or more required fields are missing,
 **WHEN** I attempt to register,
 **THEN** the application informs me that all fields are required and does not create the account.
 
**GIVEN** I enter a first or last name,
 **WHEN** it contains fewer than 3 or more than 20 letters, or contains numbers or special symbols,
 **THEN** registration does not proceed and I am informed of the applicable name requirement.
 
**GIVEN** I enter an invalid email format,
 **WHEN** I attempt to register,
 **THEN** registration does not proceed and I am informed that the email must have a valid format.
 
**GIVEN** I enter a username,
 **WHEN** it does not contain between 8 and 16 characters,
 **THEN** registration does not proceed and I am informed of the username length requirement.
 
**GIVEN** I enter a password,
 **WHEN** it has fewer than 8 characters or does not contain at least one letter, one number, and one special character,
 **THEN** registration does not proceed and I am informed of the password requirements.
 
**GIVEN** the username or email is already in use,
 **WHEN** I attempt to register,
 **THEN** the account is not created and I am informed that the username or email is already in use.

---

## User Story 1.3 — Sign In

**WHO:** As a registered user,
 **WHAT:** I want to sign in using my username and password,
 **WHY:** so that I can access the application and my personal information.
 
**Acceptance Criteria:**
**GIVEN** I have a registered account,
 **WHEN** I enter my correct username and password,
 **THEN** I am successfully signed in and taken to the dashboard/homepage.
 
**GIVEN** I enter an incorrect username or password,
 **WHEN** I attempt to sign in,
 **THEN** the application displays "Incorrect username or password" and allows me to try again.

---

## User Story 1.4 — Sign Out

**WHO:** As a signed-in user,
 **WHAT:** I want to sign out of my account,
 **WHY:** so that I can end my authenticated session.
 
**Acceptance Criteria:**
**GIVEN** I am signed in,
 **WHEN** I choose to log out,
 **THEN** I am signed out and returned to the sign-in screen.
 
**GIVEN** I have logged out,
 **WHEN** I attempt to access an authenticated feature,
 **THEN** I cannot access it without signing in again.

---

## User Story 1.5 — Manage Authentication Security

**WHO:** As a signed-in user,
 **WHAT:** I want to configure authentication methods and a trust level,
 **WHY:** so that I can control how much verification is required for sensitive account actions.
 
**Acceptance Criteria:**
**GIVEN** I access my authentication settings,
 **WHEN** I configure authentication methods,
 **THEN** I can use email verification, Google Authenticator, and passkeys.
 
**GIVEN** I configure Google Authenticator,
 **WHEN** I use the provided QR code/setup key and successfully verify a generated code,
 **THEN** Google Authenticator becomes an active authentication factor.
 
**GIVEN** I configure passkeys,
 **WHEN** I add them to my account,
 **THEN** I can register multiple passkeys, with passkeys collectively counting as one authentication factor.
 
**GIVEN** my account uses the default trust level,
 **THEN** it is **Lenient**, requiring 1 authentication factor.
 
**GIVEN** I have at least 2 factors configured,
 **WHEN** I select **Moderate**,
 **THEN** 2 authentication factors are required.
 
**GIVEN** all 3 factors are configured,
 **WHEN** I select **Strict**,
 **THEN** 3 authentication factors are required.
 
**GIVEN** I do not have enough configured factors for a trust level,
 **WHEN** I view that trust level,
 **THEN** it is grayed out and cannot be selected.
 
**GIVEN** Moderate requires 2 factors and I have all 3 available,
 **WHEN** verification is required,
 **THEN** I can choose which 2 factors to use.
 
**GIVEN** I attempt to change my trust level or add/remove an authentication method,
 **WHEN** I initiate the change,
 **THEN** I must first satisfy my current trust level.
 
**GIVEN** removing a factor would violate my current trust level,
 **WHEN** I attempt to remove it,
 **THEN** the application prevents the removal until I lower my trust level.

---

## User Story 1.6 — Manage Sensitive Account Information

**WHO:** As a signed-in user,
 **WHAT:** I want to securely change sensitive account information,
 **WHY:** so that I can maintain my account while protecting sensitive changes with identity verification.
 
**Acceptance Criteria:**
**GIVEN** I attempt to change my username, email, or password,
 **WHEN** I initiate the change,
 **THEN** I must first verify my identity according to my current trust level.
 
**GIVEN** I successfully verify my identity and change my username,
 **WHEN** the new username contains 8–16 characters and is unused,
 **THEN** my username is changed.
 
**GIVEN** I successfully verify my identity and request an email change,
 **WHEN** the new email has a valid format and is unused,
 **THEN** verification is sent to the new email.
**GIVEN** the new email has not been verified,
 **THEN** my old email remains active.
**GIVEN** I successfully verify the new email,
 **THEN** the new email becomes my active account email.
**GIVEN** I successfully verify my identity and provide a new password,
 **WHEN** it contains at least 8 characters with at least one letter, one number, and one special character,
 **THEN** my password is changed.

---

## User Story 1.7 — Delete Account

**WHO:** As a signed-in user,
 **WHAT:** I want to permanently delete my account,
 **WHY:** so that I can remove my account when I no longer want to use the application.
**Acceptance Criteria:**
**GIVEN** I choose to delete my account,
 **WHEN** I initiate account deletion,
 **THEN** I must verify my identity according to my current trust level.
**GIVEN** I successfully complete the required identity verification,
 **WHEN** I proceed with deletion,
 **THEN** my account can be permanently deleted.

# Epic 2 — Profile Management

**Epic Description:**
 This epic allows signed-in users to view and personalize their profile, view a summary of their fishing activity, access their catch history, and edit profile information that does not require additional identity verification.

## User Story 2.1 — View Profile

**WHO:** As a signed-in user,
 **WHAT:** I want to view my profile and fishing summary,
 **WHY:** so that I can see my personal information and an overview of my fishing activity.
**Acceptance Criteria:**
**GIVEN** I am signed in,
 **WHEN** I open my profile,
 **THEN** I can see my first name, last name, username, and profile picture.
**GIVEN** I am viewing my profile,
 **WHEN** my fishing summary is displayed,
 **THEN** I can see summary information such as my number of fish caught and biggest fish.
**GIVEN** I am viewing my profile,
 **WHEN** I select the Catch History tab,
 **THEN** I can access my previously recorded catches.

---

## User Story 2.2 — Manage Profile Picture

**WHO:** As a signed-in user,
 **WHAT:** I want to set or change my profile picture,
 **WHY:** so that I can personalize my profile.
**Acceptance Criteria:**
**GIVEN** I am changing my profile picture,
 **WHEN** I choose an existing image,
 **THEN** I can select an image stored on my device.
**GIVEN** I am changing my profile picture,
 **WHEN** I choose to take a new picture,
 **THEN** I can use my device's camera to take the picture.
**GIVEN** I successfully choose or take an image,
 **WHEN** the profile-picture change is completed,
 **THEN** the new image is displayed as my profile picture.

---

## User Story 2.3 — Edit Profile Information

**WHO:** As a signed-in user,
 **WHAT:** I want to edit my first and last name,
 **WHY:** so that I can keep my profile information up to date.
**Acceptance Criteria:**
**GIVEN** I edit my first or last name,
 **WHEN** the name contains between 3 and 20 letters with no numbers or special symbols,
 **THEN** the change can be saved.
**GIVEN** I edit my first or last name,
 **WHEN** it does not meet the name requirements,
 **THEN** the change is not saved and I am informed of the applicable requirement.

# Epic 3 — Social Features

**Epic Description:**
 This epic allows users to connect with other users through a following system. Users can follow public accounts, request to follow private accounts, view catches from users they follow on a timeline, and compare their fishing activity with other users.

## User Story 3.1 — Follow Users

**WHO:** As a signed-in user,
 **WHAT:** I want to follow other users,
 **WHY:** so that I can keep up with their fishing activity.

### Acceptance Criteria

**GIVEN** I am viewing another user's public profile,
 **WHEN** I choose to follow that user,
 **THEN** I begin following the user without requiring their approval.
**GIVEN** I am following another user,
 **WHEN** I choose to unfollow that user,
 **THEN** I stop following the user.

---

## User Story 3.2 — Follow Private Accounts

**WHO:** As a signed-in user,
 **WHAT:** I want to request to follow a private account,
 **WHY:** so that I can view that user's fishing activity if they approve my request.

### Acceptance Criteria

**GIVEN** I am viewing a private account that I do not follow,
 **WHEN** I choose to follow the account,
 **THEN** a follow request is sent to that user instead of immediately following the account.
**GIVEN** another user has requested to follow my private account,
 **WHEN** I view the follow request,
 **THEN** I can approve or decline the request.
**GIVEN** I approve a follow request,
 **WHEN** the approval is completed,
 **THEN** that user becomes one of my followers and can view my social fishing activity.
**GIVEN** I decline a follow request,
 **WHEN** the request is declined,
 **THEN** that user does not become one of my followers.

---

## User Story 3.3 — View Following Timeline

**WHO:** As a signed-in user,
 **WHAT:** I want to view catches from users I follow on a timeline,
 **WHY:** so that I can keep up with their recent fishing activity.

### Acceptance Criteria

**GIVEN** I follow other users,
 **WHEN** I open my social timeline,
 **THEN** I can see catches from the users I follow.
**GIVEN** I follow a private account that has approved my request,
 **WHEN** I view my timeline,
 **THEN** I can see that user's catches on my timeline.
**GIVEN** I do not have permission to follow a private account,
 **WHEN** I view my timeline,
 **THEN** catches from that private account are not displayed.

---

## User Story 3.4 — Compare Catches With Another User

**WHO:** As a signed-in user,
 **WHAT:** I want to compare my catches with another user's catches,
 **WHY:** so that I can compare our fishing activity.

### Acceptance Criteria

**GIVEN** I have access to another user's fishing activity,
 **WHEN** I choose to compare my catches with theirs,
 **THEN** the application displays my catch information alongside the other user's catch information.
**GIVEN** the other account is private and I do not have permission to view its fishing activity,
 **WHEN** I attempt to access that user's catch information,
 **THEN** the application does not allow me to view or compare their private catch information.

# Epic 4 — Groups & Competitions

**Epic Description:**
 This epic allows users to participate in fishing groups with other users and take part in group fishing competitions. Groups can hold competitions based on fishing accomplishments, such as catching the most fish or catching the biggest fish.

## User Story 4.1 — Participate in Fishing Groups

**WHO:** As a signed-in user,
 **WHAT:** I want to participate in fishing groups with other users,
 **WHY:** so that I can take part in fishing activities and competitions with other group members.

### Acceptance Criteria

**GIVEN** I am a signed-in user,
 **WHEN** I become a member of a fishing group,
 **THEN** I can access that group's available group features.
**GIVEN** I am a member of a fishing group,
 **WHEN** I view the group,
 **THEN** I can see the group's fishing competitions.

> **TBD:** We haven't decided how users **find, create, join, or leave groups**, so those behaviors shouldn't be added yet.

---

## User Story 4.2 — Participate in a Fishing Competition

**WHO:** As a group member,
 **WHAT:** I want to participate in fishing competitions within my group,
 **WHY:** so that I can compete with other group members based on our catches.

### Acceptance Criteria

**GIVEN** I am a member of a group that has a fishing competition,
 **WHEN** I participate in the competition,
 **THEN** my applicable catches can be used toward the competition.
**GIVEN** multiple group members participate in a competition,
 **WHEN** their applicable catches are compared,
 **THEN** the competition uses its selected competition type to compare the participants.

---

## User Story 4.3 — Compete for Most Fish Caught

**WHO:** As a group competition participant,
 **WHAT:** I want to compete based on the number of fish I catch,
 **WHY:** so that I can see how my total number of catches compares with other participants.

### Acceptance Criteria

**GIVEN** I am participating in a competition based on the most fish caught,
 **WHEN** my applicable catches are recorded for the competition,
 **THEN** they contribute to my total number of fish caught.
**GIVEN** participants have applicable catches,
 **WHEN** the competition results are viewed,
 **THEN** participants can be compared based on the number of fish they caught.

---

## User Story 4.4 — Compete for Biggest Fish Caught

**WHO:** As a group competition participant,
 **WHAT:** I want to compete based on the biggest fish I catch,
 **WHY:** so that I can see how the size of my catch compares with other participants.

### Acceptance Criteria

**GIVEN** I am participating in a competition based on the biggest fish caught,
 **WHEN** my applicable catches are recorded for the competition,
 **THEN** my catches can be considered for the biggest-fish competition.
**GIVEN** participants have applicable catches,
 **WHEN** the competition results are viewed,
 **THEN** participants can be compared based on their biggest applicable fish.

### Still undecided

There are several **major requirements we haven't established yet**, so I would leave them TBD rather than filling them in: **who can create groups, how users join groups, who can create competitions, how long competitions last, and whether competitions can target a particular fish species.**

# Epic 5 — New York Fish Information & Regulations

**Epic Description:**
 This epic allows users to access information about fish species and fishing regulations in New York State. Using information based on the New York State fish atlas and fishing regulations, users can find fish species near them and view information about fishing licenses, catch limits, and protected species.

## User Story 5.1 — Browse Fish Species

**WHO:** As a signed-in user,
 **WHAT:** I want to browse fish species available in the fish database,
 **WHY:** so that I can learn about fish found in New York State.

### Acceptance Criteria

**GIVEN** I am viewing the fish database,
 **WHEN** I browse the available fish species,
 **THEN** I can see fish species contained in the database.
**GIVEN** I select a fish species,
 **WHEN** I open that fish's information,
 **THEN** I can view the available information stored for that species.

> **TBD:** The exact information displayed for each fish depends on the database specifications being developed by your teammate.

---

## User Story 5.2 — Search for Fish Species

**WHO:** As a signed-in user,
 **WHAT:** I want to search for a fish species,
 **WHY:** so that I can quickly find information about a particular fish.

### Acceptance Criteria

**GIVEN** I am accessing the fish database,
 **WHEN** I search for a fish species contained in the database,
 **THEN** the application displays matching fish species.
**GIVEN** I select a fish from the search results,
 **WHEN** its fish page opens,
 **THEN** I can view the available information for that species.

---

## User Story 5.3 — Find Fish Near Me

**WHO:** As a signed-in user,
 **WHAT:** I want to see which fish species are found near me,
 **WHY:** so that I can determine what types of fish I may encounter in my area.

### Acceptance Criteria

**GIVEN** the application can determine my location,
 **WHEN** I choose to view fish near me,
 **THEN** the application displays fish species associated with locations near me.
**GIVEN** nearby fish species are displayed,
 **WHEN** I select one of the species,
 **THEN** I can access that species' available fish information.

> **TBD:** We haven't established how the application defines **"near me"** or exactly how location will be matched against the fish database.

---

## User Story 5.4 — View Catch Regulations and Limits

**WHO:** As a signed-in user,
 **WHAT:** I want to view catch regulations and limits for fish,
 **WHY:** so that I can understand the rules that apply when fishing for them.

### Acceptance Criteria

**GIVEN** I am viewing a fish species with applicable catch regulations,
 **WHEN** I view its regulation information,
 **THEN** I can see the available catch regulations and limits for that fish.
**GIVEN** regulation information is available for a fish,
 **WHEN** I access that fish's information,
 **THEN** the applicable regulation information is available to me.

---

## User Story 5.5 — View Fishing License Requirements

**WHO:** As a signed-in user,
 **WHAT:** I want to view fishing license requirements,
 **WHY:** so that I can understand what license requirements apply when fishing in New York State.

### Acceptance Criteria

**GIVEN** fishing license information is available in the application,
 **WHEN** I access the license information,
 **THEN** I can view the available New York State fishing license requirements.
**GIVEN** a fishing activity has applicable license information available,
 **WHEN** I view its requirements,
 **THEN** I can see the applicable license information.

> **TBD:** We haven't established exactly how license requirements will be organized or matched to the user.

---

## User Story 5.6 — View Protected Species

**WHO:** As a signed-in user,
 **WHAT:** I want to know when a fish is a protected species,
 **WHY:** so that I can recognize fish that have special protections.

### Acceptance Criteria

**GIVEN** a fish is identified as protected in the application's data,
 **WHEN** I view that fish's information,
 **THEN** the application indicates that the species is protected.
**GIVEN** protected-species information is available,
 **WHEN** I view the applicable information for that species,
 **THEN** I can see the available protection information.

### What remains TBD

I would leave the **exact fish information fields, definition of "near me," exact regulation fields, license matching, and protected-species details** undecided until your teammate gives us the database specifications.

# Epic 6 — AI Fish Identification & Assistant

**Epic Description:**
 This epic allows users to use AI-powered features to identify fish and learn more about fish species. Users can provide a picture of a fish for AI-assisted identification and use an AI chatbot to ask questions about fish, such as where a species can be found and what bait is recommended for catching it.

## User Story 6.1 — Identify a Fish Using a Photo

**WHO:** As a signed-in user,
 **WHAT:** I want to take a picture of a fish for AI identification,
 **WHY:** so that I can determine what species of fish I am looking at.

### Acceptance Criteria

**GIVEN** I want to identify a fish,
 **WHEN** I choose to use AI fish identification,
 **THEN** I can use my device's camera to take a picture of the fish.
**GIVEN** I have taken a picture of a fish,
 **WHEN** I submit the picture for identification,
 **THEN** the AI analyzes the image and attempts to identify the fish species.
**GIVEN** the AI is able to identify the fish,
 **WHEN** the identification is completed,
 **THEN** the application displays the identified fish species.
**GIVEN** the AI cannot identify the fish,
 **WHEN** the identification attempt is completed,
 **THEN** the application informs me that the fish could not be identified.

---

## User Story 6.2 — Ask the AI Assistant About Fish

**WHO:** As a signed-in user,
 **WHAT:** I want to ask an AI assistant questions about fish,
 **WHY:** so that I can better understand fish species and fishing for them.

### Acceptance Criteria

**GIVEN** I am using the AI assistant,
 **WHEN** I ask a question about a fish species,
 **THEN** the assistant provides a response related to my question.
**GIVEN** I ask where a particular fish can be caught,
 **WHEN** the assistant processes my question,
 **THEN** it provides available information about where that fish can be found.
**GIVEN** I ask what bait is recommended for a particular fish,
 **WHEN** the assistant processes my question,
 **THEN** it provides available information about bait for that fish.

---

## User Story 6.3 — Ask About an Identified Fish

I think this deserves its own story because it connects the two major AI features rather than leaving them completely separate.
**WHO:** As a user who has identified a fish,
 **WHAT:** I want to ask the AI assistant questions about the identified fish,
 **WHY:** so that I can learn more about the fish after identifying it.

### Acceptance Criteria

**GIVEN** the AI has identified a fish from my picture,
 **WHEN** I choose to ask the AI assistant about that fish,
 **THEN** the assistant uses the identified species as the fish I am asking about.
**GIVEN** I am asking about the identified fish,
 **WHEN** I ask a question such as where to catch it or what bait to use,
 **THEN** the assistant provides available information related to that species and my question.

### Still TBD

There are a few things we **haven't decided**, so I'd leave them open rather than assuming them:

- Whether users can **upload an existing photo** in addition to taking one with the camera.
- Whether identification should return **one result or multiple possible species**.
- Whether an identified fish links directly to its **Epic 5 fish information/regulation page**.
- Exactly what information sources the **AI chatbot** will use.
- Whether the chatbot can answer only fishing/fish questions or more general questions.
