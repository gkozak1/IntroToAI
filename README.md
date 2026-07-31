# Gradient Descent Neuron Lab

A self-contained classroom application for exploring linear regression and gradient descent through three connected stages:

1. Fit a regression line manually by changing weight and bias.
2. Lock the known bias and optimize only the weight.
3. Optimize weight and bias together as an advanced extension.

## Repository files

- `index.html` — the complete application. It contains all HTML, CSS, JavaScript, and sample data.
- `.nojekyll` — tells GitHub Pages to publish the static files without Jekyll processing.

No installation, package manager, build process, database, or external service is required.

## Test locally

You can open `index.html` directly in a modern browser.

For a local web server, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `.nojekyll`, and this `README.md` to the repository root.
3. Commit the files to the `main` branch.
4. Open the repository's **Settings**.
5. Select **Pages** under **Code and automation**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select the `main` branch and the `/(root)` folder, then save.
8. GitHub will display the published site address after deployment finishes.

For a normal project repository, the address usually follows this pattern:

```text
https://YOUR-USERNAME.github.io/REPOSITORY-NAME/
```

## Updating the lab

Replace `index.html` with a revised version and commit the change. GitHub Pages will republish the site automatically.

## Privacy and technical notes

- All calculations run in the student's browser.
- The application does not transmit or store student answers.
- Refreshing or closing the page clears the current session.
- The application is designed for current desktop and mobile browsers with JavaScript enabled.
