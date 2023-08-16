const { main } = require('./audioTool.js')
const { shell } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }

  formListener()
  menuListener()
})

// Listens for menu click events.
function menuListener() {

  document.getElementById("wav-menu-btn").addEventListener("click", (event) => {
    event.preventDefault()
    document.getElementById("wav-menu").classList.remove("hidden")
    document.getElementById("simple-menu").classList.add("hidden")
    document.getElementById("info-menu").classList.add("hidden")
  })

  document.getElementById("simple-menu-btn").addEventListener("click", (event) => {
    event.preventDefault()
    document.getElementById("wav-menu").classList.add("hidden")
    document.getElementById("simple-menu").classList.remove("hidden")
    document.getElementById("info-menu").classList.add("hidden")
  })

  document.getElementById("info-menu-btn").addEventListener("click", (event) => {
    event.preventDefault()
    document.getElementById("wav-menu").classList.add("hidden")
    document.getElementById("simple-menu").classList.add("hidden")
    document.getElementById("info-menu").classList.remove("hidden")
  })

  document.getElementById("github").addEventListener("click", (event) => {
    event.preventDefault()
    shell.openExternal("https://github.com/JoeSzymkowiczFiveM/native-audio-tool")
  })

  document.getElementById("joe").addEventListener("click", (event) => {
    event.preventDefault()
    shell.openExternal("https://github.com/JoeSzymkowiczFiveM")
  })

  document.getElementById("devyn").addEventListener("click", (event) => {
    event.preventDefault()
    shell.openExternal("https://github.com/darktrovx")
  })

  document.getElementById("snipe").addEventListener("click", (event) => {
    event.preventDefault()
    shell.openExternal("https://github.com/pushkart2")
  })

}

function removeFileFromFileList(index) {
  const dt = new DataTransfer()
  const input = document.forms["audioform"]["files"].files
  // const { files } = input
  const files = input
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (index !== i)
      dt.items.add(file) // here you exclude the file. thus removing it.
  }
  
  input.files = dt.files // Assign the updates list
}

function toast(text, style = "error", time = 2000) {
  var toastbox = document.getElementById("toastbox")
  var id =  Math.random()
  toastbox.innerHTML += `
    <div id="alert-${id}" class="alert alert-${style}">
      <span>${text}</span>
    </div>`

    setTimeout(() => {
      var elem = document.getElementById(`alert-${id}`)
      elem.parentNode.removeChild(elem)
    }, time)
}


function formListener() {
  let form = document.getElementById('audioform')
  const selectedFiles = document.getElementById("selectedFiles")
  const mp3Files = document.getElementById("files")

  // File Selection
  mp3Files.addEventListener("change", (event) => {
    Object.entries(event.target.files).forEach(([key, file]) => {
      selectedFiles.innerHTML +=
      `<div id='selectedFile${key}' class='py-1 select-none'>
        <div class='border-solid rounded border-2 border-sky-700 hover:border-sky-200 cursor-pointer'>
          <div class='px-2'>
            ${file.name}
          </div>
        </div>
      </div>`;
    })

    Object.entries(event.target.files).forEach(([key, file]) => {
      document.getElementById(`selectedFile${key}`).addEventListener("click", (e) => {
        var elem = document.getElementById(`selectedFile${key}`)
        elem.parentNode.removeChild(elem)
        removeFileFromFileList(key)
      })
    })

  })

  // Form Submit
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
      
    if (document.forms["audioform"]["files"].files.length === 0) {
      toast("No files selected", "error")
      return
    }
    if (event.target.bitrate.value === "") {
      toast("No bitrate set", "error")
      return
    }
    if (event.target.trackid.value === "") {
      toast("No track ID set", "error")
      return
    } 
    await main(document.forms["audioform"]["files"].files, event.target.bitrate.value, event.target.trackid.value, event.target.outputdst.value)
    toast("Audio files created", "success")
  })

  // Form Reset
  const reset = document.getElementById('resetbtn')
  reset.addEventListener("click", (event) => {
    event.preventDefault()
    form.reset()
    selectedFiles.innerHTML = ""
    toast("Reset form", "success")
  })
}