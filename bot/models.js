
class ItemList {
    constructor(options){
      let op = options || {};
      this.title = op.title;
      this.items = op.items || [];
      this.multipleChoices = op.multipleChoices || false;
    }
    
    findByValue(value){
      for(let i=this.items.length-1; i>=0; i--){
        let item = this.items[i];
        if(item.value == value){
          return item;
        }
      }
      return null;
    }
    
    findByName(name){
      for(let i=this.items.length-1; i>=0; i--){
        let item = this.items[i];
        if(item.name == name){
          return item;
        }
      }
      return null;
    }
    
    add(item){
      this.items.push(item);
    }
  }
  
  
  module.exports = {
    ItemList,
  }
  