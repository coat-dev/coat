module.exports = {
  name: "global-setup-task-template",
  setup: [
    {
      id: "github-repo-creation",
      run: async () => {
        // This function fakes the creation of a GitHub repository, which is an example of what a global coat task could perform in a coat project.
        //
        // Check whether the repository already exists
        console.log(
          "[FAKE] Checking whether a GitHub repository exists for this project"
        );
        const existingUrl = await new Promise((resolve) =>
          // Return null, to signalize that the fake GitHub repository
          // does not exist
          setTimeout(() => resolve(null), 1000)
        );

        if (existingUrl) {
          console.log(
            "[FAKE] The repository already exists, skipping creation"
          );
          // Return the existing repositoryUrl as the task result
          return { repositoryUrl: existingUrl };
        }

        console.log("[FAKE] Creating GitHub repository");
        const url = await new Promise((resolve) =>
          setTimeout(() => resolve("https://www.example.com"), 1000)
        );

        console.log("[FAKE] Created GitHub repository: %s", url);
        // Return the repositoryUrl as the task result
        return {
          repositoryUrl: url,
        };
      },
    },
  ],
};
