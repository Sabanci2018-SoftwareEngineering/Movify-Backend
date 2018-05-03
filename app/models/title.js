class Title {
    constructor(titleID, titleName, titleImage) {
        this.titleID = titleID,
        this.titleName = titleName,
        this.titleImage = titleImage
    }

    get title() {
        return {
            titleID: this.titleID,
            titleName: this.titleName,
            titleImage: this.titleImage,
        }
    }
}

module.exports = Title;