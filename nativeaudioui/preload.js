window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }

  FileListener()
})

function FileListener() {
  var form = document.getElementById("audioform")
  const createBtn = document.getElementById("createbtn")
  const selectedFiles = document.getElementById("selectedFiles")
  const mp3Files = document.getElementById("files")

  mp3Files.addEventListener("change", (event) => {
    Object.entries(event.target.files).forEach(([key, file]) => {
      selectedFiles.innerHTML +=
      `<div id='selectedFile${key}' class='py-1 select-none'>
        <div class='selected-file border-solid rounded border-2 border-sky-500'>
          <div class='px-2'>
            ${file.name}
          </div>
        </div>
      </div>`

      document.getElementById(`selectedFile${key}`).addEventListener("click", (e) => {
        console.log(file.name)
        event.target.files[key].value = null;
        e.target.remove()
      })
    })
  })

  form.addEventListener("submit", (event) => {
    var formData = new FormData(event.target, createBtn);
    event.preventDefault();
    console.log(formData);
  })
}