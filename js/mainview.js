function mainview(smart, langdict){
  var today = (new Date()).toISOString().split("T")[0];
  $("small").append(": "+today);

  var drugformmap = {
    "pastilla":"df_pill",
    "pill":"df_pill",
    "tablet":"df_pill",
    "comprimido":"df_pill",
    "capsule":"df_cap",
    "cápsula":"df_cap",
    "gotas":"df_eye",
    "drops":"df_eye",
    "injection":"df_inj",
    "injección":"df_inj",
    "powder":"df_pow",
    "pulverización":"df_pow",
    "inhalación":"df_inh",
    "inhalation":"df_inh"
  };
  var imageformmap = {
    "df_pill":"<i class=\"flaticon-pill\"></i>",
    "df_cap":"<i class=\"flaticon-capsule\"></i>",
    "df_eye":"<i class=\"flaticon-dropper\"></i>",
    "df_inj":"<i class=\"flaticon-syringe\"></i>",
    "df_pow":"<i class=\"flaticon-powder\"></i>",
    "df_inh":"<i class=\"flaticon-inhalator\"></i>"
  }; 

  function drugForm(formtxt){
    if (formtxt in drugformmap){      
      var code = drugformmap[formtxt];
      if (code in imageformmap && code in langdict){
        return [langdict[code], imageformmap[code]]
      }
    }
  }

  function dosageInfo(cid, dosage, medname){
    //var dosageHeadHTML = "<tr> <th>"+langdict["ld_sched"]+"</th>  <th><i class=\"fa fa-sun-o\"></i> "+langdict["ld_break"]+"</th>  <th><span class=\"glyphicon glyphicon-time\"></span> "+langdict["ld_lunch"]+"</th>  <th><span class=\"glyphicon glyphicon-cutlery\"></span> "+langdict["ld_dinner"]+" </th>  <th><i class=\"fa fa-bed\"></i> "+langdict["ld_sleep"]+"</th> </tr>";
    var breakfast = "";
    var lunch = "";
    var dinner = "";
    var sleep = "";
    var freqhr = "";
    var when = false;
    var sum = 0;
    var outvars = {
      "dosageRow":"", 
      "route":"",
      "start":"",
      "end":"",
      "form":"",
      "period":"24",
      "periodUnit":"h",
      "frequency":"1",
      "comments":""
    };
    var img = "";
    dosage.forEach(function(dsi){
      if (dsi.dose && dsi.dose.doseQuantity) {
        var q = dsi.dose.doseQuantity.value;
        console.log(q);
        if (dsi.dose.doseQuantity.unit) {
          var formtxt = dsi.dose.doseQuantity.unit;
          var res = drugForm(formtxt);
          if (res && res.length == 2){
            outvars["form"] = res[0];
            img = " "+res[1]+" ";
          }
        }
        if (dsi.route){
          outvars["route"] = dsi.route;
          if (drugformmap[outvars["form"]]=="df_eye"){
            if (outvars["route"] == "nasal"){
              img = img + "<i class=\"flaticon-nose\"></i>";
            } else if (outvars["route"] == "eye" || outvars["route"] == "ojo"){
              img = "<i class=\"flaticon-eyedropper\"></i>";
            }
          }
        }
        if (dsi.timing && dsi.timing.repeat) {
          if (dsi.timing.repeat.period){
            outvars["period"]=dsi.timing.repeat.period.toString();
          }
          if (dsi.timing.repeat.periodUnits){
            outvars["periodUnit"] = dsi.timing.repeat.periodUnits.toString();
          }
          // timing-specific properties: either specific timing in when, or general timing in frequency
          if (dsi.timing.repeat.when){
            when = dsi.timing.repeat.when;
            if (when == "CM"){
              breakfast = img +"&nbsp;" +q;
            } else if (when == "CD"){
              lunch = img +"&nbsp;" +q;
            } else if (when == "CV"){
              dinner = img +"&nbsp;" +q;
            } else if (when == "HS"){
              sleep = img +"&nbsp;" +q;
            }
            sum += parseInt(q);
          }
          else if (dsi.timing.repeat.frequency){
            outvars["frequency"] = dsi.timing.repeat.frequency.toString();
            freqhr = img +"&nbsp;" + outvars["frequency"] + "/ " + outvars["period"]+ " " + outvars["periodUnit"];
            console.log(freqhr);
          }
          // general properties for med
          if (dsi.timing.repeat.boundsPeriod){
            if (dsi.timing.repeat.boundsPeriod.start){
              outvars["start"] = dsi.timing.repeat.boundsPeriod.start.toString();
            }
            if (dsi.timing.repeat.boundsPeriod.end){
              outvars["end"] = dsi.timing.repeat.boundsPeriod.end.toString();
            }
          }
        }    
      }
      if (dsi.text){
        freqhr = freqhr + " " + dsi.text;
        outvars["comments"]=dsi.text;
      }
    });
    if (sum>0){
      outvars["frequency"] = sum.toString();
    }
    var dosageRow = "<tr><th> <a href=\"#"+medname+"\">"+medname.split(",")[0]+ "</a>"+"</th>";
    dosageRow = dosageRow + "<td class=\"text-center\" style=\"border-right: 1px solid #D8D8D8;\">" + freqhr.toString() + "</td>";
    dosageRow = dosageRow + "<td class=\"text-center\">" + breakfast.toString() + "</td>";
    dosageRow = dosageRow + "<td class=\"text-center\">" + lunch.toString() + "</td>";
    dosageRow = dosageRow + "<td class=\"text-center\">" + dinner.toString() + "</td>";
    dosageRow = dosageRow + "<td class=\"text-center\">" + sleep.toString() + "</td>";
    dosageRow = dosageRow + '</tr>';
    outvars["dosageRow"] = dosageRow;
    return outvars;
  }

  /* Create a patient welcome banner */
  var pq = smart.patient.read();

  pq.then(function(p) {
    var pid = p.id;
    var name = p.name[0];
    var formatted = name.given.join(" ");// + " " + name.family.join(" ");
    $("#patient_name").text(formatted);


    /* Create a medication list */
    smart.patient.api.search({type: "MedicationDispense", query: {patient: pid}
      }).then(function(r){
          console.log(r);
          if (r.data.total > 0) {
            var meddict = {}; // only whenHandedOver seems to be required in resource
            r.data.entry.forEach(function(re) {
              var rx = re.resource;
              if (rx.medicationCodeableConcept) {
                if (rx.medicationCodeableConcept.coding && rx.medicationCodeableConcept.coding[0].code){
                  rxcode = rx.medicationCodeableConcept.coding[0].code.toString();
                  if (rxcode in meddict){
                    if (rx.whenHandedOver > meddict[rxcode].whenHandedOver){
                      meddict[rxcode] = rx;
                    }
                  } else {
                    meddict[rxcode] = rx;
                  }
                }
              }
            });

            for (var rxcode in meddict) {
              var outvars = {};
              var rx = meddict[rxcode];
              var rxname = "";
              if (rx.medicationCodeableConcept.text){
                rxname = rx.medicationCodeableConcept.text;
              }
              if (rx.dosageInstruction){
                outvars = dosageInfo(rxcode, rx.dosageInstruction, rxname);
              } else if (rx.authorizingPrescription) {
                var pres = rx.authorizingPrescription[0].reference;
                smart.patient.api.search({type: "MedicationOrder", query: {patient: pid, identifier: pres.split("/")[1]}}).then(function(r2){
                  console.log(r2);
                  if (r2.data.total > 0){
                    r2.data.entry.forEach(function(re) {
                      rx = r2.resource;
                      if (rx.dosageInstruction){
                        outvars = dosageInfo(rxcode, rx.dosageInstruction, rxname);
                      }                    
                    });
                  } else if (rx.daysSupply){
                    outvars["end"] = rx.daysSupply.value.toString() + " days after start";
                    if (rx.whenHandedOver){
                      outvars["end"] += " (prescription handed over on " + rx.whenHandedOver + ")";
                    }
                    if (rx.quantity && rx.quantity.value){
                      var num = rx.quantity.value;
                      var den = rx.daysSupply.value;
                      outvars["frequency"] = (num/den).toString().substring(0,4);
                      outvars["period"] = "1";
                      outvars["periodUnit"] = "d";
                      if (rx.daysSupply.unit){
                        outvars["periodUnit"] = rx.daysSupply.unit;
                      }
                    }
                  }
                });
              }

              var medline = "<span class=\"anchor\" id=\""+rxname+"\"></span> <li>"+rxname;
              if (outvars["form"]){
                medline += " (" + outvars["form"] + ")";
              }
              medline += "</li> <ul>";
              if (outvars["comments"]){
                medline += "<li style=\"color:red;font-weight:bold;\">"+langdict["ld_notes"]+": "+outvars["comments"]+"</li>";
              }
              if (outvars["frequency"]){
                medline += "<li>"+langdict["ld_fre"]+": "+outvars["frequency"]+" / "+outvars["period"]+" "+outvars["periodUnit"] +"</li>";
              }
              if (outvars["route"]){
                medline += "<li>"+langdict["ld_route"]+": "+outvars["route"]+"</li>";
              }
              if (outvars["end"]){
                if (outvars["end"] < today) {
                  medline += "<li style=\"color:red;font-weight:bold;\">"+langdict["ld_end"]+": "+outvars["end"]+"</li>";
                }
                else {
                  medline += "<li>"+langdict["ld_end"]+": "+outvars["end"]+"</li>";
                }
              }
              medline += "</ul>";
              $("#medlist").append(medline);
              if (outvars["dosageRow"]){
                $("#medsched").append(outvars["dosageRow"]);                
              }
            }
          } else {
            $("#meds").html(langdict["ld_none"]);
          }
      });

    });

    /* Create a condition list */
    smart.patient.api.search({type: "Condition", query: {patient: pid, verificationStatus: "confirmed", clinicalStatus: "active"}
      }).then(function(r){
        if (r.data.total > 0) {
          r.data.entry.forEach(function(re) {
            var rx = re.resource;
            var row = $("<tr> <td>" + rx.code.text + "</td> <td>" + rx.code.coding[0].code + "</td> <td> " + rx.onsetDateTime + "</td></tr>");
            $("#diagdata").append(row);
          });
        } else {
          $("#conditions").html(langdict["ld_none"]);
        }
      });

    /* AllergyIntolerance list */
    smart.patient.api.search({type: "AllergyIntolerance", query: {patient: pid, status:"confirmed"}
      }).then(function(r){
        $("#allergies").text("");
        if (r.data.total > 0) {
          r.data.entry.forEach(function(re) {
            var rx = re.resource;
            var row = $("<tr> <td> " + rx.text.div + "</td> <td> <a href=\"" + rx.substance.coding[0].system + "\">" + rx.substance.coding[0].code + "</a> </td> <td>" + rx.recordedDate + "</td></tr>");
            $("#allergies").append(row);
          });
        } else {
          $("#allergies").html(langdict["ld_none"]);
        }
      });

}
